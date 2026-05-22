import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const resources = {
  'zh-CN': {
    translation: {
      appName: 'Yeho AI Platform',
      login: '登录',
      logout: '退出',
      tenantCode: '租户编码',
      username: '用户名',
      password: '密码',
      dashboard: 'Dashboard',
      tenants: '租户管理',
      users: '用户管理',
      providers: '模型供应商',
      models: '模型配置',
      apiKeys: 'API Key',
      wallet: '钱包余额',
      walletTransactions: '钱包流水',
      invoices: '发票申请',
      usageLogs: '调用日志',
      tokenStats: 'Token 统计',
      auditLogs: '审计日志',
      agentDebug: 'Agent 调试',
      workflow: 'Agent Workflow',
      create: '新建',
      save: '保存',
      status: '状态',
      name: '名称',
      code: '编码',
      email: '邮箱',
      phone: '电话',
      contact: '联系人',
      phaseNotice: 'Phase 1 骨架页面，后续阶段继续补齐业务闭环。',
    },
  },
  'en-US': {
    translation: {
      appName: 'Yeho AI Platform',
      login: 'Sign in',
      logout: 'Sign out',
      tenantCode: 'Tenant code',
      username: 'Username',
      password: 'Password',
      dashboard: 'Dashboard',
      tenants: 'Tenants',
      users: 'Users',
      providers: 'Providers',
      models: 'Models',
      apiKeys: 'API Keys',
      wallet: 'Wallet',
      walletTransactions: 'Wallet Ledger',
      invoices: 'Invoices',
      usageLogs: 'Usage Logs',
      tokenStats: 'Token Stats',
      auditLogs: 'Audit Logs',
      agentDebug: 'Agent Debug',
      workflow: 'Agent Workflow',
      create: 'Create',
      save: 'Save',
      status: 'Status',
      name: 'Name',
      code: 'Code',
      email: 'Email',
      phone: 'Phone',
      contact: 'Contact',
      phaseNotice: 'Phase 1 skeleton page. Business flows will be expanded later.',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
