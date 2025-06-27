// Simple test script to verify webhook endpoint functionality
// Run with: node test-webhook.js

const crypto = require('crypto');

// Test payload (simplified pull request event)
const testPayload = {
  action: 'opened',
  repository: {
    id: 123456,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: {
      login: 'testuser'
    },
    private: false
  },
  pull_request: {
    id: 789,
    number: 1,
    title: 'Test PR',
    body: 'This is a test pull request',
    state: 'open',
    diff_url: 'https://github.com/testuser/test-repo/pull/1.diff',
    patch_url: 'https://github.com/testuser/test-repo/pull/1.patch',
    head: {
      sha: 'abc123',
      ref: 'feature-branch'
    },
    base: {
      sha: 'def456',
      ref: 'main'
    },
    user: {
      login: 'testuser'
    }
  }
};

// Generate test signature
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString, 'utf8')
    .digest('hex');
  return `sha256=${signature}`;
}

async function testWebhook() {
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test-secret';
  const signature = generateSignature(testPayload, webhookSecret);
  
  console.log('🧪 Testing webhook endpoint...');
  console.log('📝 Payload:', JSON.stringify(testPayload, null, 2));
  console.log('🔐 Signature:', signature);
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-GitHub-Delivery': 'test-delivery-123',
        'X-Hub-Signature-256': signature,
        'User-Agent': 'GitHub-Hookshot/test'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.text();
    
    console.log('📊 Response Status:', response.status);
    console.log('📄 Response Body:', result);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('💥 Test error:', error.message);
    console.log('💡 Make sure the server is running: yarn dev');
  }
}

async function testHealth() {
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/health');
    const result = await response.json();
    
    console.log('📊 Health Status:', response.status);
    console.log('📄 Health Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Health check successful!');
    } else {
      console.log('❌ Health check failed!');
    }
  } catch (error) {
    console.error('💥 Health check error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Code Critics webhook tests...\n');
  
  await testHealth();
  await testWebhook();
  
  console.log('\n🎯 Test completed!');
  console.log('💡 To test with real GitHub webhooks, set up a webhook pointing to your Vercel deployment.');
}

runTests().catch(console.error);