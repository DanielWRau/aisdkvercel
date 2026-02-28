import cpvData from '@/data/cpv-codes.json'

export interface CpvCode {
  code: string
  name: string
}

const cpvCodes: CpvCode[] = cpvData as CpvCode[]

export function searchCpv(query: string, limit: number = 15): CpvCode[] {
  if (!query || query.length < 2) return []

  const searchTerm = query.toLowerCase().trim()
  const results: CpvCode[] = []

  // Search by code prefix first
  for (const cpv of cpvCodes) {
    if (cpv.code.startsWith(searchTerm)) {
      results.push(cpv)
      if (results.length >= limit) break
    }
  }

  // Then search by name
  if (results.length < limit) {
    for (const cpv of cpvCodes) {
      if (
        cpv.name.toLowerCase().includes(searchTerm) &&
        !results.some((r) => r.code === cpv.code)
      ) {
        results.push(cpv)
        if (results.length >= limit) break
      }
    }
  }

  return results
}

export function getCpvByCode(code: string): CpvCode | undefined {
  return cpvCodes.find((cpv) => cpv.code === code)
}
