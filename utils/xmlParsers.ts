import { DeliberateInfo, TransferredInfo, PromulgationInfo, AdditionalBillInfo, CommissionInfo } from '@/types/bill'

export const parseDeliberateXML = (xmlData: string): DeliberateInfo => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
    
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('본회의심의 XML 파싱 에러:', parserError.textContent)
      return {}
    }

    const items = xmlDoc.querySelectorAll('PlenarySessionExamination item')
    const info: DeliberateInfo = {}
    
    items.forEach(item => {
      const confName = item.querySelector('confName')?.textContent?.trim()
      const procDt = item.querySelector('procDt')?.textContent?.trim()
      const procResultCd = item.querySelector('procResultCd')?.textContent?.trim()
      const prsntDt = item.querySelector('prsntDt')?.textContent?.trim()
      
      if (confName) info.conference_name = confName
      if (procDt) info.plenary_date = procDt
      if (procResultCd) info.plenary_result = procResultCd
      if (prsntDt) info.present_date = prsntDt
    })
    
    return info
  } catch (error) {
    console.error('본회의심의 XML 파싱 중 오류:', error)
    return {}
  }
}

export const parseTransferredXML = (xmlData: string): TransferredInfo => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
    
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('정부이송 XML 파싱 에러:', parserError.textContent)
      return {}
    }

    const items = xmlDoc.querySelectorAll('items item')
    const info: TransferredInfo = {}
    
    items.forEach(item => {
      const transDt = item.querySelector('transDt')?.textContent?.trim()
      if (transDt) info.transfer_date = transDt
    })
    
    return info
  } catch (error) {
    console.error('정부이송 XML 파싱 중 오류:', error)
    return {}
  }
}

export const parsePromulgationXML = (xmlData: string): PromulgationInfo => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
    
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('공포 XML 파싱 에러:', parserError.textContent)
      return {}
    }

    const items = xmlDoc.querySelectorAll('items item')
    const info: PromulgationInfo = {}
    
    items.forEach(item => {
      const anounceDt = item.querySelector('anounceDt')?.textContent?.trim()
      const anounceNo = item.querySelector('anounceNo')?.textContent?.trim()
      const lawTitle = item.querySelector('lawTitle')?.textContent?.trim()
      
      if (anounceDt) info.promulgation_date = anounceDt
      if (anounceNo) info.promulgation_number = anounceNo
      if (lawTitle) info.law_title = lawTitle
    })
    
    return info
  } catch (error) {
    console.error('공포 XML 파싱 중 오류:', error)
    return {}
  }
}

export const parseAdditionalXML = (xmlData: string): AdditionalBillInfo => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
    
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('부가정보 XML 파싱 에러:', parserError.textContent)
      return {}
    }

    const info: AdditionalBillInfo = {
      related_bills: [],
      alternative_bills: []
    }
    
    // commMemo 값 파싱
    const commMemoItems = xmlDoc.querySelectorAll('commMemo item')
    if (commMemoItems.length > 0) {
      const memoTexts: string[] = []
      commMemoItems.forEach(item => {
        const memoText = item.querySelector('commMemo')?.textContent?.trim()
        if (memoText) {
          memoTexts.push(memoText)
        }
      })
      if (memoTexts.length > 0) {
        info.memo = memoTexts.join('\n\n')
      }
    }

    // billGbnCd 값 파싱 (대안 카테고리)
    const billGbnCdItems = xmlDoc.querySelectorAll('billGbnCd item')
    billGbnCdItems.forEach(item => {
      const billName = item.querySelector('billName')?.textContent?.trim()
      const billLink = item.querySelector('billLink')?.textContent?.trim()
      
      if (billName) {
        // billLink에서 bill_id 추출하여 내부 링크로 변환
        let internalLink = ''
        if (billLink) {
          const billIdMatch = billLink.match(/bill_id=([^&]+)/)
          if (billIdMatch) {
            internalLink = `/bill/${billIdMatch[1]}`
          }
        }
        
        info.alternative_bills!.push({
          name: billName,
          link: internalLink
        })
      }
    })
    
    // 관련 의안 파싱 (exhaust item들에서)
    const exhaustItems = xmlDoc.querySelectorAll('exhaust item')
    exhaustItems.forEach(item => {
      const billName = item.querySelector('billName')?.textContent?.trim()
      const billLink = item.querySelector('billLink')?.textContent?.trim()
      
      if (billName) {
        // billLink에서 bill_id 추출하여 내부 링크로 변환
        let internalLink = ''
        if (billLink) {
          const billIdMatch = billLink.match(/bill_id=([^&]+)/)
          if (billIdMatch) {
            internalLink = `/bill/${billIdMatch[1]}`
          }
        }
        
        info.related_bills!.push({
          name: billName,
          link: internalLink
        })
      }
    })
    
    console.log('파싱된 부가정보:', info)
    return info
  } catch (error) {
    console.error('부가정보 XML 파싱 중 오류:', error)
    return {}
  }
}

export const parseCommissionXML = (xmlData: string): CommissionInfo => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlData, 'text/xml')
    
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      console.error('XML 파싱 에러:', parseError.textContent)
      return { parse_error: 'XML 파싱 오류: ' + parseError.textContent } as CommissionInfo
    }
    
    const result: CommissionInfo = {
      committee_name: '',
      examination_reports: [],
      proceedings: [],
      documents: [],
      dates: [],
      result: '',
      submit_date: '',
      present_date: '',
      process_date: '',
      related_committees: []
    }

    // 소관위원회 정보
    const committeeElement = doc.querySelector('committeeName, COMMITTEE_NAME')
    if (committeeElement) {
      result.committee_name = committeeElement.textContent || ''
    }

    // 회부일 (submitDt)
    const submitDtElement = doc.querySelector('submitDt, SUBMIT_DT')
    if (submitDtElement) {
      result.submit_date = submitDtElement.textContent || ''
    }

    // 상정일
    const presentDtElement = doc.querySelector('presentDt, PRESENT_DT')
    if (presentDtElement) {
      result.present_date = presentDtElement.textContent || ''
    }

    // 처리일 (procDt)
    const procDtElement = doc.querySelector('procDt, PROC_DT')
    if (procDtElement) {
      result.process_date = procDtElement.textContent || ''
    }

    // 처리결과
    const procResultElement = doc.querySelector('procResultCd, PROC_RESULT_CD')
    if (procResultElement) {
      result.result = procResultElement.textContent || ''
    }

    // 문서 URL들 (docName1, docName2로 구분)
    const docName1 = doc.querySelector('docName1, DOC_NAME1')?.textContent
    const docName2 = doc.querySelector('docName2, DOC_NAME2')?.textContent
    const hwpUrl1 = doc.querySelector('hwpUrl1, HWP_URL1')?.textContent
    const hwpUrl2 = doc.querySelector('hwpUrl2, HWP_URL2')?.textContent
    const pdfUrl1 = doc.querySelector('pdfUrl1, PDF_URL1')?.textContent
    const pdfUrl2 = doc.querySelector('pdfUrl2, PDF_URL2')?.textContent

    // docName1 관련 문서들
    if (hwpUrl1) {
      result.examination_reports!.push({
        type: `${docName1 || '검토보고서'} (HWP)`,
        url: hwpUrl1.replace('&amp;', '&')
      })
    }
    if (pdfUrl1) {
      result.examination_reports!.push({
        type: `${docName1 || '검토보고서'} (PDF)`,
        url: pdfUrl1.replace('&amp;', '&')
      })
    }

    // docName2 관련 문서들
    if (hwpUrl2) {
      result.examination_reports!.push({
        type: `${docName2 || '심사보고서'} (HWP)`,
        url: hwpUrl2.replace('&amp;', '&')
      })
    }
    if (pdfUrl2) {
      result.examination_reports!.push({
        type: `${docName2 || '심사보고서'} (PDF)`,
        url: pdfUrl2.replace('&amp;', '&')
      })
    }

    // 관련위 심사정보 (comitExamination)
    const comitExaminationElements = doc.querySelectorAll('comitExamination item, COMIT_EXAMINATION item')
    comitExaminationElements.forEach(item => {
      const committeeName = item.querySelector('comitName, COMIT_NAME')?.textContent
      const submitDt = item.querySelector('submitDt, SUBMIT_DT')?.textContent
      const presentDt = item.querySelector('presentDt, PRESENT_DT')?.textContent
      const procDt = item.querySelector('procDt, PROC_DT')?.textContent
      
      if (committeeName) {
        result.related_committees!.push({
          name: committeeName,
          submit_date: submitDt || undefined,
          present_date: presentDt || undefined,
          process_date: procDt || undefined
        })
      }
    })

    // 날짜 배열 (기존 로직 유지)
    const dates = xmlData.match(/\d{4}-\d{2}-\d{2}/g) || []
    result.dates = [...new Set(dates)]

    // 회의 진행 내역
    const meetings = doc.querySelectorAll('JurisdictionMeeting item, jurisdictionMeeting item')
    meetings.forEach(meeting => {
      const confName = meeting.querySelector('confName, CONF_NAME')?.textContent
      const confDt = meeting.querySelector('confDt, CONF_DT')?.textContent
      const confResult = meeting.querySelector('confResult, CONF_RESULT')?.textContent
      
      if (confName) {
        result.proceedings!.push({
          name: confName,
          date: confDt || undefined,
          result: confResult || undefined
        })
      }
    })

    return result
  } catch (error) {
    console.error('XML 파싱 오류:', error)
    return { parse_error: 'XML 파싱 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류') } as CommissionInfo
  }
} 