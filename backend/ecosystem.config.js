module.exports = {
  apps: [{
    name: 'citae-api',
    script: 'server.js',
    instances: 1,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/citae/err.log',
    out_file: '/var/log/citae/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
