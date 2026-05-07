const http = require('http');

async function testAPI() {
  // Login
  const postData = JSON.stringify({username: 'admin', password: 'admin'});
  
  const loginReq = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const loginData = JSON.parse(data);
      const token = loginData.accessToken;
      
      // Verify token has companyId
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('✅ JWT Token Payload:');
      console.log('   companyId:', payload.companyId);
      console.log('   userId:', payload.userId);
      console.log('   role:', payload.role);
 console.log('');
      
      // Test COA endpoint
      const coaReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/accounting/chart-of-accounts',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const response = JSON.parse(data2);
          console.log('📊 Chart of Accounts Response:');
          console.log('   Status: ' + (Array.isArray(response) ? 'Array' : 'Object'));
          console.log('   Count: ' + (Array.isArray(response) ? response.length : 'N/A'));
          if (Array.isArray(response) && response.length > 0) {
            console.log('   First item company_id:', response[0].company_id);
          }
          console.log('');
          console.log('Full Response:', data2.substring(0, 500));
        });
      });
      coaReq.end();
    });
  });
  
  loginReq.write(postData);
}

testAPI();
