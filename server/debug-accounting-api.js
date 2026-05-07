const http = require('http');

// First login
const postData = JSON.stringify({username: 'admin', password: 'admin'});

const req1 = http.request({
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
    
    // Now test Chart of Accounts
    const req2 = http.request({
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
        console.log('Chart of Accounts Response:');
        console.log(data2.substring(0, 500));
      });
    });
    req2.end();
  });
});

req1.write(postData);
