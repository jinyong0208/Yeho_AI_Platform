UPDATE ai_model
SET support_stream = TRUE,
    updated_at = NOW()
WHERE model_code IN ('deepseek-chat', 'deepseek-reasoner', 'qwen-plus', 'qwen-max');
