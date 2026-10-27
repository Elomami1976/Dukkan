import { spawn } from 'node:child_process'
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_CHANNEL: 'msedge' } })
child.on('exit', code => { process.exitCode = code ?? 1 })
