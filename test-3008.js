import http from 'http';
import { spawn } from 'child_process';

const child = spawn('npx', ['tsx', 'server.ts'], { 
  env: { ...process.env, APP_PORT: '3008' } 
});

child.stdout.on('data', d => console.log('STDOUT', d.toString()));
child.stderr.on('data', d => console.log('STDERR', d.toString()));

setTimeout(() => {
  http.get('http://localhost:3008/api/features', r => {
    let d='';
    r.on('data', c=>d+=c);
    r.on('end', () => {
      console.log('MYDB:', d);
      child.kill();
      process.exit(0);
    });
  });
}, 5000);
