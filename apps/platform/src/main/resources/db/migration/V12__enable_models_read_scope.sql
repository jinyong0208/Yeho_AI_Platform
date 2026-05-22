alter table tenant_api_key
    alter column scopes set default 'chat:completion,embedding:create,models:read';

update tenant_api_key
set scopes = case
    when scopes is null or trim(scopes) = '' then 'models:read'
    when position('models:read' in scopes) = 0 then scopes || ',models:read'
    else scopes
end
where scopes is null or position('models:read' in scopes) = 0;
