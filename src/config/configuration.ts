export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publicKey: process.env.STRIPE_PUBLIC_KEY,
  },

  admin: {
    secretCode: process.env.ADMIN_SECRET_CODE,
  },

  frontend: {
    url: process.env.FRONTEND_URL,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },

  aws: {
    region: process.env.AWS_S3_REGION,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    baseUrl: process.env.AWS_S3_BASE_URL,
    endpoint: process.env.AWS_S3_ENDPOINT,
  },

  notifications: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME,
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    firebase: {
      config: process.env.FIREBASE_CONFIG,
    },
  },

  features: {
    // Si true: le PRO peut définir isRequired=true/false pour chaque étape
    // Si false: toutes les étapes sont automatiquement isRequired=true
    allowOptionalSteps: process.env.ALLOW_OPTIONAL_STEPS === 'true',
  },
});
