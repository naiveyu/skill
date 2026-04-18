module.exports = {
  apps: [{
    name: 'inote-server',
    script: 'dist/index.js',
    cwd: '/opt/inote/server',
    env: {
      NODE_ENV: 'production',
      PORT: 3456,
      HOST: '127.0.0.1',
      ADMIN_KEY: 'your-secure-admin-key-here'
    },
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/opt/inote/server/logs/error.log',
    out_file: '/opt/inote/server/logs/out.log',
    merge_logs: true
  }]
}
