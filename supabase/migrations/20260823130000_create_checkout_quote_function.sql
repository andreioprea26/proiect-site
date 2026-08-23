begin;

-- Read-only checkout boundary. The caller supplies identifiers and selected
-- values only; every name, price, option rule and stock decision is rebuilt
-- from the database. The function deliberately returns no raw inventory data.
create function public.quote_checkout(p_lines jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result_lines jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_subtotal_minor bigint := 0;
  v_item jsonb;
  v_item_index integer := 0;
  v_key text;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_active_variant_count integer;
  v_base_price_minor bigint;
  v_customization_total_minor bigint;
  v_unit_price_minor bigint;
  v_line_subtotal_minor bigint;
  v_customizations_input jsonb;
  v_customizations_snapshot jsonb;
  v_customization public.customization_options%rowtype;
  v_customization_item jsonb;
  v_customization_id_text text;
  v_value jsonb;
  v_value_present boolean;
  v_text text;
  v_boolean boolean;
  v_min_length integer;
  v_max_length integer;
  v_line_valid boolean;
  v_inventory_quantity integer;
  v_inventory_found boolean;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    return jsonb_build_object(
      'valid', false,
      'lines', '[]'::jsonb,
      'errors', jsonb_build_array(jsonb_build_object(
        'key', null,
        'code', 'invalid_cart',
        'message', 'Coșul trimis pentru verificare nu este valid.'
      )),
      'subtotalMinor', 0,
      'currency', 'RON'
    );
  end if;

  if jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 50 then
    return jsonb_build_object(
      'valid', false,
      'lines', '[]'::jsonb,
      'errors', jsonb_build_array(jsonb_build_object(
        'key', null,
        'code', 'invalid_cart_size',
        'message', 'Coșul trebuie să conțină între 1 și 50 de linii.'
      )),
      'subtotalMinor', 0,
      'currency', 'RON'
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    v_item_index := v_item_index + 1;
    v_key := coalesce(nullif(left(v_item->>'key', 500), ''), v_item_index::text);
    v_line_valid := true;
    v_variant_id := null;
    v_variant := null;
    v_customizations_snapshot := '[]'::jsonb;
    v_customization_total_minor := 0;

    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item->>'productId', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'invalid_product',
        'message', 'Produsul din această linie nu este valid.'
      ));
      continue;
    end if;
    v_product_id := (v_item->>'productId')::uuid;

    if coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,2}$' then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'invalid_quantity',
        'message', 'Cantitatea trebuie să fie un număr întreg între 1 și 99.'
      ));
      continue;
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'invalid_quantity',
        'message', 'Cantitatea trebuie să fie un număr întreg între 1 și 99.'
      ));
      continue;
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_product_id;

    if not found
      or v_product.publication_status <> 'published'::public.product_publication_status
      or v_product.availability_status = 'unavailable'::public.product_availability_status
    then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'product_unavailable',
        'message', 'Produsul nu mai este disponibil pentru checkout.'
      ));
      continue;
    end if;

    if (v_product.product_type = 'unique'::public.product_type
      or v_product.availability_status = 'unique'::public.product_availability_status)
      and v_quantity > 1
    then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'unique_quantity',
        'message', 'Produsul unicat poate avea cantitatea maximă 1.'
      ));
      continue;
    end if;

    select count(*) into v_active_variant_count
    from public.product_variants pv
    where pv.product_id = v_product_id and pv.is_active;

    if v_active_variant_count > 0 then
      if coalesce(v_item->>'variantId', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'variant_required',
          'message', 'Alege o variantă activă pentru acest produs.'
        ));
        continue;
      end if;
      v_variant_id := (v_item->>'variantId')::uuid;
      select pv.* into v_variant
      from public.product_variants pv
      where pv.id = v_variant_id
        and pv.product_id = v_product_id
        and pv.is_active;
      if not found then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'variant_invalid',
          'message', 'Varianta selectată nu mai este disponibilă.'
        ));
        continue;
      end if;
    elsif nullif(v_item->>'variantId', '') is not null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'variant_invalid',
        'message', 'Produsul nu acceptă varianta trimisă.'
      ));
      continue;
    end if;

    v_customizations_input := coalesce(v_item->'customizations', '[]'::jsonb);
    if jsonb_typeof(v_customizations_input) <> 'array'
      or jsonb_array_length(v_customizations_input) > 50
    then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'customizations_invalid',
        'message', 'Personalizările trimise nu sunt valide.'
      ));
      continue;
    end if;

    for v_customization_item in
      select value from jsonb_array_elements(v_customizations_input)
    loop
      v_customization_id_text := v_customization_item->>'id';
      if coalesce(v_customization_id_text, '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'customization_invalid',
          'message', 'O personalizare selectată nu mai este disponibilă.'
        ));
        v_line_valid := false;
        exit;
      end if;

      if not exists (
          select 1 from public.customization_options co
          where co.id = v_customization_id_text::uuid
            and co.product_id = v_product_id
            and co.is_active
        )
        or (
          select count(*) from jsonb_array_elements(v_customizations_input) ci
          where ci->>'id' = v_customization_id_text
        ) <> 1
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'customization_invalid',
          'message', 'O personalizare selectată nu mai este disponibilă.'
        ));
        v_line_valid := false;
        exit;
      end if;
    end loop;

    if not v_line_valid then continue; end if;

    for v_customization in
      select co.* from public.customization_options co
      where co.product_id = v_product_id and co.is_active
      order by co.display_order, co.created_at
    loop
      select exists (
        select 1 from jsonb_array_elements(v_customizations_input) ci
        where ci->>'id' = v_customization.id::text
      ) into v_value_present;
      select ci->'value' into v_value
      from jsonb_array_elements(v_customizations_input) ci
      where ci->>'id' = v_customization.id::text
      limit 1;

      if v_customization.option_type = 'image'::public.customization_option_type
        and v_customization.is_required
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'required_image_unavailable',
          'message', 'Personalizarea obligatorie cu imagine necesită fluxul privat dintr-o etapă viitoare.'
        ));
        v_line_valid := false;
        exit;
      end if;

      if not v_value_present then
        if v_customization.is_required then
          v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'key', v_key,
            'code', 'customization_required',
            'message', 'Completează personalizarea obligatorie „' || v_customization.name || '”.'
          ));
          v_line_valid := false;
          exit;
        end if;
        continue;
      end if;

      if v_customization.option_type = 'selection'::public.customization_option_type then
        if jsonb_typeof(v_value) <> 'string' then
          v_line_valid := false;
        else
          v_text := btrim(v_value #>> '{}');
          v_line_valid := v_text <> ''
            and coalesce(v_customization.configuration->'values', '[]'::jsonb) ? v_text;
        end if;
      elsif v_customization.option_type = 'text'::public.customization_option_type then
        if jsonb_typeof(v_value) <> 'string' then
          v_line_valid := false;
        else
          v_text := btrim(v_value #>> '{}');
          v_min_length := case
            when coalesce(v_customization.configuration->>'min_length', '') ~ '^[0-9]+$'
            then (v_customization.configuration->>'min_length')::integer
            else null
          end;
          v_max_length := case
            when coalesce(v_customization.configuration->>'max_length', '') ~ '^[0-9]+$'
            then (v_customization.configuration->>'max_length')::integer
            else null
          end;
          v_line_valid := v_text <> ''
            and (v_min_length is null or char_length(v_text) >= v_min_length)
            and (v_max_length is null or char_length(v_text) <= v_max_length);
        end if;
      elsif v_customization.option_type = 'boolean'::public.customization_option_type then
        if jsonb_typeof(v_value) <> 'boolean' then
          v_line_valid := false;
        else
          v_boolean := (v_value #>> '{}')::boolean;
          v_line_valid := not v_customization.is_required or v_boolean;
          if not v_boolean then continue; end if;
        end if;
      elsif v_customization.option_type = 'image'::public.customization_option_type then
        if jsonb_typeof(v_value) <> 'boolean' then
          v_line_valid := false;
        else
          v_boolean := (v_value #>> '{}')::boolean;
          if not v_boolean then continue; end if;
        end if;
      end if;

      if not v_line_valid then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_key,
          'code', 'customization_value_invalid',
          'message', 'Valoarea pentru personalizarea „' || v_customization.name || '” nu mai este validă.'
        ));
        exit;
      end if;

      v_customization_total_minor := v_customization_total_minor
        + round(v_customization.additional_cost * 100)::bigint;
      v_customizations_snapshot := v_customizations_snapshot ||
        jsonb_build_array(jsonb_build_object(
          'id', v_customization.id,
          'name', v_customization.name,
          'optionType', v_customization.option_type,
          'value', case
            when v_customization.option_type in (
              'selection'::public.customization_option_type,
              'text'::public.customization_option_type
            ) then to_jsonb(v_text)
            else to_jsonb(v_boolean)
          end,
          'additionalCostMinor', round(v_customization.additional_cost * 100)::bigint
        ));
    end loop;

    if not v_line_valid then continue; end if;

    v_inventory_found := false;
    if v_variant_id is not null then
      select i.quantity, true into v_inventory_quantity, v_inventory_found
      from public.inventory i where i.variant_id = v_variant_id;
    else
      select i.quantity, true into v_inventory_quantity, v_inventory_found
      from public.inventory i where i.product_id = v_product_id;
    end if;
    if coalesce(v_inventory_found, false) and v_inventory_quantity < v_quantity then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'code', 'insufficient_stock',
        'message', 'Cantitatea solicitată nu mai este disponibilă.'
      ));
      continue;
    end if;

    v_base_price_minor := round(
      coalesce(v_variant.price_override, v_product.base_price) * 100
    )::bigint;
    v_unit_price_minor := v_base_price_minor + v_customization_total_minor;
    v_line_subtotal_minor := v_unit_price_minor * v_quantity;
    v_subtotal_minor := v_subtotal_minor + v_line_subtotal_minor;

    v_result_lines := v_result_lines || jsonb_build_array(jsonb_build_object(
      'key', v_key,
      'productId', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'productType', v_product.product_type,
      'availabilityStatus', v_product.availability_status,
      'variant', case when v_variant_id is null then null else jsonb_build_object(
        'id', v_variant.id,
        'title', v_variant.title,
        'attributes', v_variant.attributes
      ) end,
      'customizations', v_customizations_snapshot,
      'quantity', v_quantity,
      'basePriceMinor', v_base_price_minor,
      'customizationTotalMinor', v_customization_total_minor,
      'unitPriceMinor', v_unit_price_minor,
      'lineSubtotalMinor', v_line_subtotal_minor
    ));
  end loop;

  return jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'lines', v_result_lines,
    'errors', v_errors,
    'subtotalMinor', v_subtotal_minor,
    'currency', 'RON'
  );
end;
$$;

revoke all on function public.quote_checkout(jsonb) from public;
grant execute on function public.quote_checkout(jsonb) to anon, authenticated;

commit;
