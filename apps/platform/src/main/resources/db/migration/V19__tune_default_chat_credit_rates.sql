with target_model as (
    select
        m.id as model_id,
        v.input_price,
        v.output_price,
        v.input_credit_rate,
        v.output_credit_rate,
        v.billing_multiplier,
        coalesce((
            select max(pv.version_no)
            from ai_model_price_version pv
            where pv.model_id = m.id
        ), 0) + 1 as version_no
    from ai_model m
    join (
        values
            ('qwen-plus', 0.0800::numeric, 0.3200::numeric, 0.2000::numeric, 0.8000::numeric, 1::numeric),
            ('deepseek-chat', 0.1200::numeric, 0.3600::numeric, 0.3000::numeric, 0.9000::numeric, 1::numeric)
    ) as v(model_code, input_price, output_price, input_credit_rate, output_credit_rate, billing_multiplier)
        on v.model_code = m.model_code
),
inserted_version as (
    insert into ai_model_price_version (
        id,
        model_id,
        version_no,
        input_price,
        output_price,
        input_credit_rate,
        output_credit_rate,
        billing_multiplier,
        effective_at,
        remark,
        created_at,
        updated_at
    )
    select
        (920000000000000000 + row_number() over (order by model_id))::bigint,
        model_id,
        version_no,
        input_price,
        output_price,
        input_credit_rate,
        output_credit_rate,
        billing_multiplier,
        now(),
        'Tune MVP chat pricing target: 0.5-2.5 CNY per regular conversation',
        now(),
        now()
    from target_model
    on conflict (model_id, version_no) do nothing
    returning id, model_id, input_price, output_price, input_credit_rate, output_credit_rate, billing_multiplier
)
update ai_model m
set input_price = v.input_price,
    output_price = v.output_price,
    input_credit_rate = v.input_credit_rate,
    output_credit_rate = v.output_credit_rate,
    billing_multiplier = v.billing_multiplier,
    current_price_version_id = v.id,
    updated_at = now()
from inserted_version v
where m.id = v.model_id;
