// Simple test script to verify the mobile app can communicate with admin portal API
// Run with: node test-api.js

const API_BASE_URL = 'http://localhost:3000/api';

async function testCreateReport() {
  console.log('Testing report creation...');
  
  const testReport = {
    title: 'Test Pothole Report',
    description: 'This is a test report created from mobile app to verify API connection',
    category: 'POTHOLE',
    priority: 'NORMAL',
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    address: '123 Test Street, New York, NY',
    images: [],
    videos: [],
    audioNotes: []
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testReport),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Report created successfully:', result);
    return result.data.id;
  } catch (error) {
    console.error('❌ Failed to create report:', error.message);
    return null;
  }
}

async function testFetchReports() {
  console.log('Testing reports fetch...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/reports?limit=10`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Reports fetched successfully:', result.data.length, 'reports');
    
    // Check if our test report appears in the list
    const testReports = result.data.filter(r => r.title.includes('Test Pothole Report'));
    if (testReports.length > 0) {
      console.log('✅ Found our test reports in the list:', testReports.length);
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Failed to fetch reports:', error.message);
    return [];
  }
}

async function runTests() {
  console.log('🚀 Starting API connectivity test...');
  console.log('Make sure the admin portal is running at http://localhost:3000\n');
  
  // Test creating a report
  const reportId = await testCreateReport();
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test fetching reports
  await testFetchReports();
  
  console.log('\n🏁 Test completed!');
  console.log('If both tests passed, the mobile app can successfully communicate with the admin portal.');
}

// Add basic fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  try {
    const fetch = require('node-fetch');
    global.fetch = fetch;
  } catch (err) {
    console.log('Please install node-fetch: npm install node-fetch');
    console.log('Or run this test in a browser console instead.');
    process.exit(1);
  }
}

runTests().catch(console.error);
