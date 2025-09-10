// Test script to verify mobile app can connect to backend API
const API_BASE_URL = 'http://localhost:3001/api';

async function testFetchReports() {
  console.log('🔍 Testing fetch reports...');
  try {
    const response = await fetch(`${API_BASE_URL}/reports`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ Fetch reports successful:', data.data.length, 'reports found');
    return data.data;
  } catch (error) {
    console.error('❌ Fetch reports failed:', error.message);
    return [];
  }
}

async function testCreateReport() {
  console.log('📝 Testing create report...');
  try {
    const reportData = {
      title: 'Mobile App Test Report',
      description: 'यह mobile app से create किया गया test report है। Street light खराब है।',
      category: 'STREETLIGHT',
      priority: 'NORMAL',
      latitude: 23.3441 + Math.random() * 0.01,
      longitude: 85.3096 + Math.random() * 0.01,
      address: 'Test Location, Ranchi, Jharkhand 834001',
    };

    const response = await fetch(`${API_BASE_URL}/reports/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Create report successful:', result.data.id);
    return result.data;
  } catch (error) {
    console.error('❌ Create report failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Mobile App <-> Backend API Connection\n');
  
  // Test 1: Fetch existing reports
  const reports = await testFetchReports();
  
  // Test 2: Create a new report
  const newReport = await testCreateReport();
  
  // Test 3: Fetch reports again to verify new report was added
  console.log('\n🔄 Testing fetch reports after creation...');
  const updatedReports = await testFetchReports();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Initial reports: ${reports.length}`);
  console.log(`New report created: ${newReport ? 'Yes' : 'No'}`);
  console.log(`Final reports: ${updatedReports.length}`);
  console.log(`Connection status: ${newReport && updatedReports.length > reports.length ? '✅ WORKING' : '❌ ISSUES'}`);
  
  if (newReport) {
    console.log('\n📱➡️🖥️ Mobile App can successfully send reports to Backend!');
    console.log('🖥️➡️📱 Admin Portal will receive and display these reports!');
  }
}

// Run the tests
runTests().catch(console.error);
