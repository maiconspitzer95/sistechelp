module.exports = {
  apps: [
    {
      name: 'sistech',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5002,
        HOST: '0.0.0.0',
      },
    },
  ],
};
