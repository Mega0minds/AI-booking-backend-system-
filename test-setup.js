/**
 * Simple test script to verify backend setup
 */
const axios = require('axios');

async function testBackend() {
    console.log('🧪 Testing Backend Setup...\n');
    
    const baseURL = 'http://localhost:5000';
    
    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${baseURL}/health`);
        console.log('✅ Health check passed:', healthResponse.data.message);
        
        // Test 2: API health check
        console.log('\n2. Testing API health endpoint...');
        const apiHealthResponse = await axios.get(`${baseURL}/api/health`);
        console.log('✅ API health check passed:', apiHealthResponse.data.message);
        
        // Test 3: Conversation start
        console.log('\n3. Testing conversation start...');
        const conversationResponse = await axios.post(`${baseURL}/api/conversation/start`);
        console.log('✅ Conversation start passed:', conversationResponse.data.message);
        
        console.log('\n🎉 All tests passed! Backend is ready for frontend integration.');
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend server is not running.');
            console.log('💡 Start the server with: npm start');
        } else {
            console.log('❌ Test failed:', error.message);
        }
    }
}

// Run the test
testBackend();
