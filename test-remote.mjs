import https from 'https';

async function remoteFetch(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://sabir511.onrender.com');
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Tanafas-Tester/1.0',
        ...(options.headers || {})
      },
      timeout: 15000
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${path}`));
    });

    req.on('error', reject);

    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataStr);
    }
    req.end();
  });
}

async function runComprehensiveAudit() {
  console.log('=== Starting Comprehensive Remote Audit on https://sabir511.onrender.com ===\n');

  // 1. Health check
  try {
    const health = await remoteFetch('/api/health');
    console.log('1. [Health Check]', health.status, JSON.stringify(health.body));
  } catch (e) {
    console.error('1. [Health Check Error]', e.message);
  }

  // 2. Admin verification
  let adminToken = '';
  try {
    const adminCheck = await remoteFetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { password: 'admin@tanafas2026' });
    console.log('2. [Admin Login verify]', adminCheck.status, JSON.stringify(adminCheck.body));
    adminToken = adminCheck.body?.adminToken || 'admin@tanafas2026';
  } catch (e) {
    console.error('2. [Admin Verify Error]', e.message);
  }

  const adminHeaders = {
    'Content-Type': 'application/json',
    'X-Admin-Token': adminToken
  };

  // 3. Access Codes List
  try {
    const codes = await remoteFetch('/api/access-codes', { headers: adminHeaders });
    console.log('3. [Access Codes]', codes.status, `Count: ${Array.isArray(codes.body) ? codes.body.length : 'Not array'}`);
    if (Array.isArray(codes.body)) {
      console.log('Sample code:', codes.body[0]);
    }
  } catch (e) {
    console.error('3. [Access Codes Error]', e.message);
  }

  // 4. Competitions List
  let competitions = [];
  try {
    const comps = await remoteFetch('/api/competitions', { headers: adminHeaders });
    competitions = Array.isArray(comps.body) ? comps.body : [];
    console.log('4. [Competitions]', comps.status, `Count: ${competitions.length}`);
    if (competitions.length > 0) {
      console.log('First competition sample:', {
        id: competitions[0].id,
        name: competitions[0].name,
        webSlug: competitions[0].webSlug,
        status: competitions[0].status,
        competitionType: competitions[0].competitionType,
        questionsCount: competitions[0].questions?.length
      });
    }
  } catch (e) {
    console.error('4. [Competitions Error]', e.message);
  }

  // 5. Check Single Competition Endpoint (by ID and by webSlug)
  if (competitions.length > 0) {
    const targetComp = competitions[0];
    try {
      const byId = await remoteFetch(`/api/competitions/${targetComp.id}`);
      console.log('5a. [Get Comp by ID]', byId.status, byId.body ? `OK (${byId.body.name})` : 'Failed');
    } catch (e) {
      console.error('5a. [Get Comp by ID Error]', e.message);
    }

    if (targetComp.webSlug) {
      try {
        const bySlug = await remoteFetch(`/api/competitions/${targetComp.webSlug}`);
        console.log('5b. [Get Comp by webSlug]', bySlug.status, bySlug.body ? `OK (${bySlug.body.name})` : 'Failed');
      } catch (e) {
        console.error('5b. [Get Comp by webSlug Error]', e.message);
      }
    }
  }

  // 6. Telegram Settings & Webhook info
  try {
    const teleSettings = await remoteFetch('/api/telegram/settings', { headers: adminHeaders });
    console.log('6a. [Telegram Settings]', teleSettings.status, JSON.stringify(teleSettings.body));
  } catch (e) {
    console.error('6a. [Telegram Settings Error]', e.message);
  }

  try {
    const teleWebhook = await remoteFetch('/api/telegram/webhook-info', { headers: adminHeaders });
    console.log('6b. [Telegram Webhook Info]', teleWebhook.status, JSON.stringify(teleWebhook.body));
  } catch (e) {
    console.error('6b. [Telegram Webhook Info Error]', e.message);
  }

  // 7. Question Bank Domains & Questions
  try {
    const domains = await remoteFetch('/api/bank/domains', { headers: adminHeaders });
    console.log('7a. [Bank Domains]', domains.status, `Count: ${Array.isArray(domains.body) ? domains.body.length : 'Not array'}`);
    const questions = await remoteFetch('/api/bank/questions', { headers: adminHeaders });
    console.log('7b. [Bank Questions]', questions.status, `Count: ${Array.isArray(questions.body) ? questions.body.length : 'Not array'}`);
  } catch (e) {
    console.error('7. [Bank Error]', e.message);
  }

  // 8. Test Access Code Validation (Teacher Portal Login)
  try {
    const validCheck = await remoteFetch('/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code: 'TCHR-DEMO' });
    console.log('8. [Validate Code TCHR-DEMO]', validCheck.status, JSON.stringify(validCheck.body));
  } catch (e) {
    console.error('8. [Validate Code Error]', e.message);
  }

  // 9. Test AI Question Generation
  try {
    const aiGen = await remoteFetch('/api/ai/generate-questions', {
      method: 'POST',
      headers: adminHeaders
    }, {
      topic: 'الفيزياء والجاذبية',
      count: 2,
      level: 'متوسط'
    });
    console.log('9. [AI Question Gen]', aiGen.status, typeof aiGen.body === 'object' ? `Success (${aiGen.body?.questions?.length || 0} questions)` : aiGen.raw?.slice(0, 100));
  } catch (e) {
    console.error('9. [AI Gen Error]', e.message);
  }
}

runComprehensiveAudit();
