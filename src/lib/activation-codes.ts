export type ActivationScope =
  | "single_course"
  | "single_subject"
  | "three_subjects"
  | "all_courses"

export type ActivationVariant = "general" | "thpt" | "exam" | "vip"

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

export const ACTIVATION_TEMPLATES: ActivationTemplate[] = [
  {
    key: "single-teacher-20",
    label: "Goi 1 giao vien",
    scope: "single_course",
    variant: "general",
    quantity: 20,
    maxCourseSelect: 1,
    maxSubjectSelect: 0,
    grantsAllCourses: false,
    prefix: "GV",
  },
  {
    key: "full-subject-thpt-10",
    label: "Full 1 mon - THPT",
    scope: "single_subject",
    variant: "thpt",
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
    prefix: "F1T",
  },
  {
    key: "full-subject-exam-10",
    label: "Full 1 mon - Ky thi ngoai",
    scope: "single_subject",
    variant: "exam",
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
    prefix: "F1K",
  },
  {
    key: "full-3-subjects-thpt-5",
    label: "Full 3 mon - THPT",
    scope: "three_subjects",
    variant: "thpt",
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
    prefix: "F3T",
  },
  {
    key: "full-3-subjects-exam-5",
    label: "Full 3 mon - Ky thi ngoai",
    scope: "three_subjects",
    variant: "exam",
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
    prefix: "F3K",
  },
  {
    key: "vip-all-in-one-1",
    label: "VIP ALL IN ONE",
    scope: "all_courses",
    variant: "vip",
    quantity: 1,
    maxCourseSelect: 0,
    maxSubjectSelect: 0,
    grantsAllCourses: true,
    prefix: "VIP",
  },
]

export function getTemplateByKey(key: string): ActivationTemplate | undefined {
  return ACTIVATION_TEMPLATES.find((tpl) => tpl.key === key)
}

export function normalizeActivationCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "")
}

function randomToken(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function generateCode(prefix: string): string {
  return `${prefix}-${randomToken(4)}-${randomToken(4)}`
}

