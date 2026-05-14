export type ActivationScope =
  | 'single_course'
  | 'single_subject'
  | 'three_subjects'
  | 'all_courses'

export type ActivationVariant = 'general' | 'thpt' | 'exam' | 'vip'

export interface ActivationTemplate {
  key: string
  label: string
  scope: ActivationScope
  variant: ActivationVariant
  quantity: number
  maxCourseSelect: number
  maxSubjectSelect: number
  grantsAllCourses: boolean
  prefix: string
}

// Keys must match CODE_TEMPLATES in types.ts
export const ACTIVATION_TEMPLATES: ActivationTemplate[] = [
  {
    key: 'one_teacher',
    label: '1 Giáo viên',
    scope: 'single_course',
    variant: 'general',
    quantity: 20,
    maxCourseSelect: 1,
    maxSubjectSelect: 0,
    grantsAllCourses: false,
    prefix: 'GV',
  },
  {
    key: 'full_subject_thpt',
    label: 'Full 1 môn THPT',
    scope: 'single_subject',
    variant: 'thpt',
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
    prefix: 'F1T',
  },
  {
    key: 'full_subject_exam',
    label: 'Full 1 môn kỳ thi ngoài',
    scope: 'single_subject',
    variant: 'exam',
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
    prefix: 'F1K',
  },
  {
    key: 'full_3_subjects_thpt',
    label: 'Full 3 môn THPT',
    scope: 'three_subjects',
    variant: 'thpt',
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
    prefix: 'F3T',
  },
  {
    key: 'full_3_subjects_exam',
    label: 'Full 3 môn kỳ thi ngoài',
    scope: 'three_subjects',
    variant: 'exam',
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
    prefix: 'F3K',
  },
  {
    key: 'vip_all_in_one',
    label: 'VIP ALL IN ONE',
    scope: 'all_courses',
    variant: 'vip',
    quantity: 1,
    maxCourseSelect: 0,
    maxSubjectSelect: 0,
    grantsAllCourses: true,
    prefix: 'VIP',
  },
]

export function getTemplateByKey(key: string): ActivationTemplate | undefined {
  return ACTIVATION_TEMPLATES.find(tpl => tpl.key === key)
}

export function normalizeActivationCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

function randomToken(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export function generateCode(prefix: string): string {
  return `${prefix}-${randomToken(4)}-${randomToken(4)}`
}
