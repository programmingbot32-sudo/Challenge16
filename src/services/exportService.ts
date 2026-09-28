import { ParticipantResult, Competition, TeamResult } from '../types';

export interface CertificateData {
  studentName: string;
  teacherName?: string;
  schoolName?: string;
  competitionTitle: string;
  score?: number;
  rank?: number;
  isManual?: boolean;
  reason?: string;
  dateStr?: string;
  teamName?: string;
}

function printHtmlSafely(htmlContent: string): void {
  try {
    let iframe = document.getElementById('tanafas_print_frame') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'tanafas_print_frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('IFrame print fallback:', err);
  }

  // Fallback to direct print
  window.print();
}

export const ExportService = {
  exportToCSV(results: ParticipantResult[], competitionName: string): boolean {
    if (!results || results.length === 0) {
      console.warn('لا توجد نتائج مسجلة لتصديرها.');
      return false;
    }

    const headers = [
      'الترتيب',
      'اسم المشارك',
      'المدرسة / الجهة',
      'الفريق',
      'الدرجة',
      'الإجابات الصحيحة',
      'إجمالي الأسئلة',
      'الوقت المستغرق (ثواني)',
      'تاريخ ووقت المشاركة'
    ];

    const rows = results.map(r => [
      r.rank || '-',
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.school || '-').replace(/"/g, '""')}"`,
      `"${(r.teamName || '-').replace(/"/g, '""')}"`,
      r.score,
      r.correctAnswers,
      r.totalQuestions,
      r.totalTimeSeconds.toFixed(1),
      `"${r.submittedAt ? new Date(r.submittedAt).toLocaleString('ar-SA') : '-'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = competitionName.replace(/[\s\\\/:]+/g, '_');
    link.setAttribute('download', `نتائج_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  },

  exportTeamsToCSV(teams: TeamResult[], competitionName: string): boolean {
    if (!teams || teams.length === 0) {
      console.warn('لا توجد نتائج فرق مسجلة لتصديرها.');
      return false;
    }

    const headers = [
      'الترتيب',
      'اسم الفريق',
      'المدرسة / الجهة',
      'عدد الأعضاء',
      'مجموع درجات الفريق',
      'متوسط درجات الفريق',
      'إجمالي الوقت (ثواني)',
      'متوسط الوقت (ثواني)'
    ];

    const rows = teams.map(t => [
      t.rank || '-',
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${(t.school || '-').replace(/"/g, '""')}"`,
      t.membersCount,
      t.totalScore,
      t.averageScore,
      t.totalTimeSeconds.toFixed(1),
      t.averageTime.toFixed(1)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = competitionName.replace(/[\s\\\/:]+/g, '_');
    link.setAttribute('download', `نتائج_الفرق_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  },

  printReport(results: ParticipantResult[], competition: Competition, teamResults?: TeamResult[]): void {
    const rowsHtml = results.map(r => {
      const pct = r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : 0;
      return `
      <tr style="border-bottom: 1px solid #e2e8f0; text-align: center;">
        <td style="padding: 10px; font-weight: bold;">${r.rank || '-'}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">${r.name}</td>
        <td style="padding: 10px;">${r.school || '-'}</td>
        ${competition.participationType === 'team' ? `<td style="padding: 10px;">${r.teamName || '-'}</td>` : ''}
        <td style="padding: 10px; font-weight: bold; color: #0f766e;">${pct}%</td>
        <td style="padding: 10px;">${r.correctAnswers} / ${r.totalQuestions}</td>
        <td style="padding: 10px;">${r.totalTimeSeconds.toFixed(1)} ثانية</td>
      </tr>
      `;
    }).join('');

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير نتائج — ${competition.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #1e293b; }
          .header { border-bottom: 2px solid #00A3C4; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
          .title { font-size: 22px; font-weight: 800; color: #0C2340; margin: 0; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 15px; }
          th { background: #0C2340; color: #ffffff; padding: 10px; font-weight: 700; }
          .btn-print { background: #00A3C4; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 15px; font-family: 'Cairo'; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: left;">
          <button class="btn-print" onclick="window.print()">🖨️ طباعة التقرير</button>
        </div>
        <div class="header">
          <div class="title">تقرير نتائج مسابقة: ${competition.name}</div>
          <div class="subtitle">منصة تَنافُسْ التعليمية • مكتبة المعلمين — ${new Date().toLocaleDateString('ar-SA')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>المركز</th>
              <th style="text-align: right;">اسم المشارك</th>
              <th>المدرسة / الجهة</th>
              ${competition.participationType === 'team' ? `<th>الفريق</th>` : ''}
              <th>النسبة</th>
              <th>الإجابات</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() { window.print(); }, 350);
          });
        </script>
      </body>
      </html>
    `;

    printHtmlSafely(reportHtml);
  },

  /**
   * Prints the certificate with 100% identical styling and guaranteed single-page layout.
   */
  printCertificateHTML(params: CertificateData): void {
    const student = (params.studentName || 'اسم المشارك').trim();
    const title = (params.competitionTitle || 'المسابقة التعليمية').trim();
    const cleanTeacher = params.teacherName && params.teacherName.trim() && params.teacherName !== 'معلم المنصة' ? params.teacherName.trim() : '';
    const dateStr = params.dateStr || new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

    // Badges
    const pills: string[] = [];
    if (params.score !== undefined) pills.push(`النتيجة: ${params.score}%`);
    if (params.rank) pills.push(`المركز: #${params.rank}`);
    if (params.teamName) pills.push(`الفريق: ${params.teamName}`);

    const certHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>شهادة شكر وتقدير — ${student}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Cairo:wght@500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Cairo', sans-serif;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .action-bar {
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 999999;
            display: flex;
            gap: 10px;
          }
          .btn-print {
            background: #00A3C4;
            color: #ffffff;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            font-weight: 800;
            padding: 10px 22px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 6px 14px rgba(0,0,0,0.25);
          }
          .btn-close {
            background: #e2e8f0;
            color: #334155;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            font-weight: 700;
            padding: 10px 18px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
          }
          .cert-container {
            width: 275mm;
            height: 190mm;
            background: #FAF8F2;
            border: 4px solid #C5A059;
            border-radius: 16px;
            padding: 12mm 16mm;
            box-sizing: border-box;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .inner-frame {
            position: absolute;
            inset: 4mm;
            border: 1px dashed rgba(212, 175, 55, 0.7);
            border-radius: 12px;
            pointer-events: none;
          }
          .corner-tl { position: absolute; top: 6mm; left: 6mm; width: 10mm; height: 10mm; border-top: 2px solid #C5A059; border-left: 2px solid #C5A059; }
          .corner-tr { position: absolute; top: 6mm; right: 6mm; width: 10mm; height: 10mm; border-top: 2px solid #C5A059; border-right: 2px solid #C5A059; }
          .corner-bl { position: absolute; bottom: 6mm; left: 6mm; width: 10mm; height: 10mm; border-bottom: 2px solid #C5A059; border-left: 2px solid #C5A059; }
          .corner-br { position: absolute; bottom: 6mm; right: 6mm; width: 10mm; height: 10mm; border-bottom: 2px solid #C5A059; border-right: 2px solid #C5A059; }

          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #FFFDF5;
            border: 1px solid rgba(212, 175, 55, 0.7);
            color: #8C6D1F;
            padding: 4px 20px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 800;
          }
          .main-title {
            font-family: 'Amiri', serif;
            font-size: 42px;
            font-weight: 700;
            color: #0C2340;
            margin: 4px 0 0;
            line-height: 1.1;
          }
          .gold-divider {
            width: 140px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #D4AF37, transparent);
            margin: 4px auto 0;
          }
          .intro-text {
            font-size: 15px;
            color: #475569;
            margin: 6px 0 2px;
            font-weight: 600;
          }
          .student-name-box {
            margin: 4px 0;
          }
          .student-name {
            font-family: 'Amiri', serif;
            font-size: 44px;
            font-weight: 700;
            color: #0C2340;
            display: inline-block;
            border-bottom: 2.5px solid #D4AF37;
            padding: 0 35px 2px;
          }
          .reason-text {
            font-size: 15px;
            color: #334155;
            max-width: 200mm;
            line-height: 1.5;
            margin: 4px auto 0;
          }
          .comp-title {
            font-size: 18px;
            font-weight: 800;
            color: #0C2340;
            margin-top: 2px;
          }
          .pills-container {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 6px;
          }
          .pill {
            background: #FFFDF5;
            border: 1px solid rgba(212, 175, 55, 0.6);
            color: #8C6D1F;
            font-size: 12px;
            font-weight: 800;
            padding: 3px 16px;
            border-radius: 9999px;
          }
          .footer-section {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 8px 12mm 0;
            border-top: 1px solid rgba(212, 175, 55, 0.3);
            box-sizing: border-box;
          }
          .sign-box {
            text-align: right;
            min-width: 50mm;
          }
          .sign-box.left {
            text-align: left;
          }
          .sign-role {
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .sign-val {
            font-size: 16px;
            font-weight: 800;
            color: #0C2340;
          }
          .seal-circle {
            width: 22mm;
            height: 22mm;
            border-radius: 50%;
            border: 2px solid #D4AF37;
            background: #FFFBF0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #8C6D1F;
          }
          .seal-trophy { font-size: 15px; margin-bottom: 1px; }
          .seal-name { font-size: 9px; font-weight: 900; line-height: 1.1; }

          @media print {
            .action-bar { display: none !important; }
            html, body {
              width: 100% !important;
              height: 100% !important;
              background: #ffffff !important;
            }
            .cert-container {
              box-shadow: none !important;
              margin: auto !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="action-bar">
          <button class="btn-print" onclick="window.print()">🖨️ طباعة الشهادة / حفظ PDF</button>
          <button class="btn-close" onclick="window.close()">إغلاق</button>
        </div>

        <div class="cert-container">
          <div class="inner-frame"></div>
          <div class="corner-tl"></div>
          <div class="corner-tr"></div>
          <div class="corner-bl"></div>
          <div class="corner-br"></div>

          <!-- 1. Header Badge -->
          <div class="header-badge">
            <span>📖</span>
            <span>مكتبة المعلمين  •  منصة تَنافُسْ</span>
          </div>

          <!-- 2. Main Title -->
          <div>
            <h1 class="main-title">شَهَادَةُ شُكْرٍ وَتَقْدِيـرٍ</h1>
            <div class="gold-divider"></div>
          </div>

          <!-- 3. Intro Phrase -->
          <div class="intro-text">تَسُرُّنا الإشادة بالتميز والإبداع، ومَنْح هذه الشهادة لـ:</div>

          <!-- 4. Student Name -->
          <div class="student-name-box">
            <span class="student-name">${student}</span>
            ${params.schoolName && params.schoolName !== 'المملكة العربية السعودية' ? `
              <div style="font-size: 14px; font-weight: bold; color: #64748B; margin-top: 6px;">🏫 ${params.schoolName}</div>
            ` : ''}
          </div>

          <!-- 5. Reason -->
          <div class="reason-text">
            ${params.isManual ? `
              تقديراً للمشاركة الفاعلة والجهد المتميز في:
              <div class="comp-title">${params.reason || title}</div>
            ` : `
              تقديراً للتفوق والأداء الرائع في مسابقة:
              <div class="comp-title">${title}</div>
            `}
          </div>

          <!-- 6. Achievement Pills -->
          ${!params.isManual && pills.length > 0 ? `
            <div class="pills-container">
              ${pills.map(p => `<div class="pill">${p}</div>`).join('')}
            </div>
          ` : ''}

          <!-- 7. Footer -->
          <div class="footer-section">
            <div class="sign-box">
              <div class="sign-role">${cleanTeacher ? 'المعلم' : 'الإشراف العام'}</div>
              <div class="sign-val">${cleanTeacher || 'منصة تَنافُسْ'}</div>
            </div>

            <div class="seal-circle">
              <span class="seal-trophy">🏆</span>
              <span class="seal-name">مكتبة<br>المعلمين</span>
            </div>

            <div class="sign-box left">
              <div class="sign-role">التاريخ</div>
              <div class="sign-val">${dateStr}</div>
            </div>
          </div>

        </div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 300);
          });
        </script>
      </body>
      </html>
    `;

    printHtmlSafely(certHtml);
  },

  /**
   * Generates and downloads a crystal clear, high-resolution PNG image (1920x1080) of the certificate.
   */
  downloadCertificateImage(params: CertificateData): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const student = (params.studentName || 'اسم المشارك').trim();
    const title = (params.competitionTitle || 'المسابقة التعليمية').trim();
    const cleanTeacher = params.teacherName && params.teacherName.trim() && params.teacherName !== 'معلم المنصة' ? params.teacherName.trim() : '';
    const dateStr = params.dateStr || new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

    // 1. Background
    ctx.fillStyle = '#FAF8F2';
    ctx.fillRect(0, 0, 1920, 1080);

    // 2. Borders
    // Outer Frame
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#C5A059';
    ctx.strokeRect(40, 40, 1840, 1000);

    // Inner Dashed Line
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D4AF37';
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(60, 60, 1800, 960);
    ctx.setLineDash([]);

    // Corner brackets
    const drawCorner = (x: number, y: number, fx: boolean, fy: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
      ctx.strokeStyle = '#C5A059';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 35);
      ctx.lineTo(0, 0);
      ctx.lineTo(35, 0);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(75, 75, false, false);
    drawCorner(1845, 75, true, false);
    drawCorner(75, 1005, false, true);
    drawCorner(1845, 1005, true, true);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    // 3. Header Badge
    ctx.fillStyle = '#FFFDF5';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    const bW = 420;
    const bH = 48;
    const bX = (1920 - bW) / 2;
    ctx.beginPath();
    ctx.roundRect(bX, 110, bW, bH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8C6D1F';
    ctx.font = 'bold 22px Cairo, sans-serif';
    ctx.fillText('📖 مكتبة المعلمين  •  منصة تَنافُسْ', 960, 142);

    // 4. Main Heading
    ctx.fillStyle = '#0C2340';
    ctx.font = 'bold 64px Amiri, serif';
    ctx.fillText('شَهَادَةُ شُكْرٍ وَتَقْدِيـرٍ', 960, 240);

    // Gold line
    const grad = ctx.createLinearGradient(760, 0, 1160, 0);
    grad.addColorStop(0, 'rgba(212,175,55,0)');
    grad.addColorStop(0.5, '#D4AF37');
    grad.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(760, 265);
    ctx.lineTo(1160, 265);
    ctx.stroke();

    // 5. Intro
    ctx.fillStyle = '#64748B';
    ctx.font = '600 24px Cairo, sans-serif';
    ctx.fillText('تَسُرُّنا الإشادة بالتميز والإبداع، ومَنْح هذه الشهادة لـ:', 960, 340);

    // 6. Student Name
    ctx.fillStyle = '#0C2340';
    ctx.font = 'bold 62px Amiri, serif';
    ctx.fillText(student, 960, 435);

    // Underline
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3.5;
    const nameMeasure = ctx.measureText(student).width;
    const halfW = Math.max(160, nameMeasure / 2 + 50);
    ctx.beginPath();
    ctx.moveTo(960 - halfW, 460);
    ctx.lineTo(960 + halfW, 460);
    ctx.stroke();

    // 6.b School name if available
    if (params.schoolName && params.schoolName !== 'المملكة العربية السعودية') {
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillText(`🏫 ${params.schoolName}`, 960, 492);
    }

    // 7. Reason / Competition
    ctx.fillStyle = '#475569';
    ctx.font = '600 24px Cairo, sans-serif';
    if (params.isManual) {
      ctx.fillText(`تقديراً للمشاركة الفاعلة والجهد المتميز في:`, 960, 535);
      ctx.fillStyle = '#0C2340';
      ctx.font = 'bold 30px Cairo, sans-serif';
      ctx.fillText(params.reason || title, 960, 580);
    } else {
      ctx.fillText(`تقديراً للتفوق والأداء الرائع في مسابقة:`, 960, 535);
      ctx.fillStyle = '#0C2340';
      ctx.font = 'bold 32px Cairo, sans-serif';
      ctx.fillText(title, 960, 580);
    }

    // 8. Achievement Pills
    if (!params.isManual && (params.score !== undefined || params.rank !== undefined || params.teamName)) {
      const pills: string[] = [];
      if (params.score !== undefined) pills.push(`النتيجة: ${params.score}%`);
      if (params.rank) pills.push(`المركز: #${params.rank}`);
      if (params.teamName) pills.push(`الفريق: ${params.teamName}`);
      const pillText = pills.join('   •   ');

      ctx.fillStyle = '#FFFDF5';
      ctx.strokeStyle = '#E8C868';
      ctx.lineWidth = 2;
      const pW = ctx.measureText(pillText).width + 80;
      const pX = (1920 - pW) / 2;
      ctx.beginPath();
      ctx.roundRect(pX, 640, pW, 50, 25);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#8C6D1F';
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillText(pillText, 960, 673);
    }

    // 9. Footer
    ctx.strokeStyle = 'rgba(212,175,55,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 800);
    ctx.lineTo(1800, 800);
    ctx.stroke();

    // Teacher
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText(cleanTeacher ? 'المعلم' : 'الإشراف العام', 1660, 855);
    ctx.fillStyle = '#0C2340';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.fillText(cleanTeacher || 'منصة تَنافُسْ', 1660, 900);

    // Seal (Center)
    ctx.textAlign = 'center';
    const sX = 960;
    const sY = 890;
    const sR = 60;
    ctx.fillStyle = '#FFFBF0';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sX, sY, sR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8C6D1F';
    ctx.font = '24px Cairo, sans-serif';
    ctx.fillText('🏆', sX, sY - 10);
    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.fillText('مكتبة المعلمين', sX, sY + 18);

    // Date
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText('التاريخ', 260, 855);
    ctx.fillStyle = '#0C2340';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.fillText(dateStr, 260, 900);

    // Download PNG
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    const safeStudent = student.replace(/[\s\\\/:]+/g, '_');
    a.download = `شهادة_شكر_وتقدير_${safeStudent}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
