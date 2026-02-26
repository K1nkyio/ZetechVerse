#!/usr/bin/env node

/**
 * Integration Test Script for ZetechVerse
 * Tests the API endpoints to ensure everything is working correctly
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testEndpoint(method, url, data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, config);
    const result = await response.json();

    return {
      status: response.status,
      success: result.success,
      data: result.data,
      message: result.message,
      errors: result.errors
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Running ZetechVerse Integration Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  const health = await testEndpoint('GET', '/../health');
  if (health.success) {
    console.log('   ✅ Health check passed');
    passed++;
  } else {
    console.log('   ❌ Health check failed');
    failed++;
  }

  // Test 2: Register User
  console.log('\n2. Testing User Registration...');
  const registerData = {
    email: `test${Date.now()}@zetech.ac.ke`,
    username: `testuser${Date.now()}`,
    password: 'Password123',
    full_name: 'Test User',
    student_id: '12345',
    course: 'Computer Science',
    year_of_study: 3
  };

  const register = await testEndpoint('POST', '/auth/register', registerData);
  let userToken = null;

  if (register.success && register.data?.token) {
    console.log('   ✅ User registration passed');
    userToken = register.data.token;
    passed++;
  } else {
    console.log('   ❌ User registration failed:', register.message || register.error);
    failed++;
  }

  // Test 3: Login User
  if (userToken) {
    console.log('\n3. Testing User Login...');
    const login = await testEndpoint('POST', '/auth/login', {
      email: registerData.email,
      password: 'Password123'
    });

    if (login.success && login.data?.token) {
      userToken = login.data.token;
      console.log('   ✅ User login passed');
      passed++;
    } else {
      console.log('   ❌ User login failed:', login.message || login.error);
      failed++;
    }
  }

  // Test 4: Get Opportunities
  console.log('\n4. Testing Get Opportunities...');
  const opportunities = await testEndpoint('GET', '/opportunities');
  if (opportunities.success !== undefined) {
    console.log('   ✅ Get opportunities passed');
    passed++;
  } else {
    console.log('   ❌ Get opportunities failed');
    failed++;
  }

  // Test 5: Create Opportunity (requires auth)
  if (userToken) {
    console.log('\n5. Testing Create Opportunity...');
    const oppData = {
      title: 'Test Software Engineering Internship',
      description: 'A test internship opportunity for software engineering students.',
      company: 'Test Company',
      location: 'Nairobi',
      type: 'internship',
      application_deadline: '2024-12-31',
      start_date: '2025-01-15',
      end_date: '2025-04-15',
      salary_min: 25000,
      salary_max: 35000,
      is_paid: true,
      requirements: ['JavaScript', 'React', 'Node.js'],
      benefits: ['Mentorship', 'Training', 'Certificate']
    };

    const createOpp = await testEndpoint('POST', '/opportunities', oppData, userToken);
    let createdOppId = null;

    if (createOpp.success) {
      console.log('   ✅ Create opportunity passed');
      createdOppId = createOpp.data?.id;
      passed++;
    } else {
      console.log('   ❌ Create opportunity failed:', createOpp.message || createOpp.error);
      failed++;
    }

    // Test 6: Get Single Opportunity
    if (createdOppId) {
      console.log('\n6. Testing Get Single Opportunity...');
      const singleOpp = await testEndpoint('GET', `/opportunities/${createdOppId}`);
      if (singleOpp.success && singleOpp.data?.id === createdOppId) {
        console.log('   ✅ Get single opportunity passed');
        passed++;
      } else {
        console.log('   ❌ Get single opportunity failed');
        failed++;
      }
    }

    // Test 7: Get Featured Opportunities
    console.log('\n7. Testing Get Featured Opportunities...');
    const featuredOpp = await testEndpoint('GET', '/opportunities/featured');
    if (featuredOpp.success !== undefined) {
      console.log('   ✅ Get featured opportunities passed');
      passed++;
    } else {
      console.log('   ❌ Get featured opportunities failed');
      failed++;
    }
  }

  // Test 8: Get Profile (requires auth)
  if (userToken) {
    console.log('\n8. Testing Get User Profile...');
    const profile = await testEndpoint('GET', '/auth/profile', null, userToken);
    if (profile.success && profile.data?.email) {
      console.log('   ✅ Get user profile passed');
      passed++;
    } else {
      console.log('   ❌ Get user profile failed:', profile.message || profile.error);
      failed++;
    }
  }

  // Summary
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! ZetechVerse is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the backend setup.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
