const https = require('https');
const key = 'sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL';
const baseUrl = 'https://pvvdbcvdhggqbembqrda.supabase.co/rest/v1/';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const req = https.request(baseUrl + path, {
      method,
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runEndToEndTest() {
  console.log('--- STARTING E2E TEST SCENARIO ---');

  // 1. Participant: Find or Create Lydia Knapp
  let pRes = await api('GET', 'participants?vorname=eq.Lydia&nachname=eq.Knapp');
  let lydia = pRes.data && pRes.data.length > 0 ? pRes.data[0] : null;
  if (!lydia) {
    let createP = await api('POST', 'participants', { vorname: 'Lydia', nachname: 'Knapp' });
    lydia = createP.data[0];
    console.log('Created Participant Lydia Knapp (ID:', lydia.id, ')');
  } else {
    console.log('Found Participant Lydia Knapp (ID:', lydia.id, ')');
  }

  // 2. Competition: Create 'TEST - Vereinsmeisterschaft'
  let cRes = await api('POST', 'competitions', {
    name: 'TEST - Vereinsmeisterschaft',
    datum: '2026-09-01',
    anzahl_ergebnisse: 3,
    teamgroesse: 3,
    status: 'geplant'
  });
  let comp = cRes.data[0];
  console.log('Created Competition:', comp.name, '(ID:', comp.id, ')');

  // 3. Team: Create 'TEST - Team Grün'
  let tRes = await api('POST', 'teams', {
    competition_id: comp.id,
    name: 'TEST - Team Grün'
  });
  let team = tRes.data[0];
  console.log('Created Team:', team.name, '(ID:', team.id, ')');

  // 4. Start 1: Lydia Knapp -> Team Grün -> AK = true
  let s1Res = await api('POST', 'starts', {
    competition_id: comp.id,
    participant_id: lydia.id,
    team_id: team.id,
    ak: true
  });
  let start1 = s1Res.data[0];
  console.log('Created Start 1 (Team Grün, AK=true, ID:', start1.id, ')');

  // Results for Start 1: 12.40, 13.10, 11.80
  let r1Res = await api('POST', 'results', [
    { start_id: start1.id, nummer: 1, wert: 12.40 },
    { start_id: start1.id, nummer: 2, wert: 13.10 },
    { start_id: start1.id, nummer: 3, wert: 11.80 }
  ]);
  console.log('Inserted Results for Start 1:', r1Res.data.map(r => r.wert));

  // 5. Start 2: Lydia Knapp -> Einzelstart (team_id=null) -> AK = false
  let s2Res = await api('POST', 'starts', {
    competition_id: comp.id,
    participant_id: lydia.id,
    team_id: null,
    ak: false
  });
  let start2 = s2Res.data[0];
  console.log('Created Start 2 (Einzelstart, AK=false, ID:', start2.id, ')');

  // Results for Start 2: 10.00, 11.00, 12.00
  let r2Res = await api('POST', 'results', [
    { start_id: start2.id, nummer: 1, wert: 10.00 },
    { start_id: start2.id, nummer: 2, wert: 11.00 },
    { start_id: start2.id, nummer: 3, wert: 12.00 }
  ]);
  console.log('Inserted Results for Start 2:', r2Res.data.map(r => r.wert));

  // 6. Verification: Query starts and their results
  let allStartsRes = await api('GET', `starts?competition_id=eq.${comp.id}&select=*`);
  console.log('Total Starts in Competition:', allStartsRes.data.length);

  for (const s of allStartsRes.data) {
    let rRes = await api('GET', `results?start_id=eq.${s.id}&order=nummer.asc`);
    let sum = rRes.data.reduce((acc, cur) => acc + Number(cur.wert), 0);
    console.log(`Start ID: ${s.id} | Team: ${s.team_id ? 'TEST - Team Grün' : 'Einzelstart'} | AK: ${s.ak} | Values: ${rRes.data.map(r => r.wert).join(', ')} | Sum: ${sum.toFixed(2)}`);
  }

  console.log('--- E2E TEST COMPLETED SUCCESSFULLY! ---');
}

runEndToEndTest().catch(console.error);
