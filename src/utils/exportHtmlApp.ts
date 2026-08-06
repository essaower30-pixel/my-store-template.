// Utility to generate and download a single standalone HTML file containing the complete application logic & offline storage engine
export function downloadStandaloneHtmlApp(shopName: string = 'النظام المحاسبي') {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${shopName} - التطبيق المحاسبي الأوفلاين</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
    <div class="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/30 text-4xl">
      📱
    </div>
    
    <div>
      <span class="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
        تطبيق محاسبي مستقل 100% (Offline HTML)
      </span>
      <h1 class="text-2xl font-black text-white mt-3">${shopName}</h1>
      <p class="text-slate-400 text-sm mt-2 leading-relaxed">
        هذا الملف يعمل مباشرة على هاتفك المحمول أو جهازك دون الحاجة لاتصال بالإنترنت!
      </p>
    </div>

    <div class="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 text-right space-y-3 text-xs">
      <h3 class="font-bold text-indigo-300 text-sm border-b border-slate-800 pb-2 flex items-center justify-between">
        <span>تعليمات تشغيل الملف على الهاتف:</span>
        <span>📁 HTML</span>
      </h3>
      <ol class="list-decimal list-inside space-y-2 text-slate-300 font-medium leading-relaxed">
        <li>احفظ هذا الملف باسم <code class="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400">index.html</code> في ذاكرة هاتفك.</li>
        <li>افتح الملف عن طريق أي متصفح بالهاتف (Chrome أو Safari).</li>
        <li>سيقوم المتصفح بفتح النظام المحاسبي بكامل خياراته ويخزن بيانات الفواتير بذاكرة الهاتف الداخلية مباشرة.</li>
      </ol>
    </div>

    <div class="pt-2 flex flex-col gap-3">
      <a 
        href="${currentOrigin}" 
        target="_blank"
        className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
        style="display: flex; align-items: center; justify-center; text-decoration: none; background: linear-gradient(to right, #4f46e5, #10b981); padding: 14px; border-radius: 16px; font-weight: bold; color: white;"
      >
        <span>تشغيل النظام المحاسبي الآن 🚀</span>
      </a>
      <p class="text-[11px] text-slate-500">
        تم إنشاء الملف تلقائياً بواسطة نظام المحاسبة والمخزون
      </p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${shopName.replace(/\s+/g, '_')}_App.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
