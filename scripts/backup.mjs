import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function backup() {
  console.log('Bắt đầu tải dữ liệu từ Supabase...')
  
  const { data: accounts, error: err1 } = await supabase.from('accounts').select('*')
  if (err1) return console.error('Lỗi khi tải accounts:', err1)
  
  const { data: enrollments, error: err2 } = await supabase.from('enrollments').select('*')
  if (err2) return console.error('Lỗi khi tải enrollments:', err2)
  
  const { data: lesson_progress, error: err3 } = await supabase.from('lesson_progress').select('*')
  if (err3) return console.error('Lỗi khi tải lesson_progress:', err3)

  const backupData = {
    accounts,
    enrollments,
    lesson_progress,
    timestamp: new Date().toISOString()
  }

  const outputPath = path.resolve(process.cwd(), 'backup-db.json')
  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2))
  
  console.log('✅ Đã backup thành công vào file backup-db.json')
  console.log(`- Accounts: ${accounts.length}`)
  console.log(`- Enrollments: ${enrollments.length}`)
  console.log(`- Lesson Progress: ${lesson_progress.length}`)
}

backup()
