const repo = 'Elomami1976/Dukkan'
const message = document.getElementById('release-message')
const title = document.getElementById('download-title')
const detail = document.getElementById('download-detail')
const button = document.getElementById('download-button')

fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  .then((response) => { if (!response.ok) throw new Error('no-release'); return response.json() })
  .then((release) => {
    const asset = (release.assets || []).find((item) => item.name.toLowerCase().endsWith('.exe'))
    if (!asset) throw new Error('no-installer')
    title.textContent = `الإصدار ${release.tag_name}`
    detail.textContent = `${asset.name} • ${(asset.size / 1024 / 1024).toFixed(1)} MB`
    message.textContent = 'النسخة الرسمية متاحة للتنزيل من GitHub Releases.'
    button.href = asset.browser_download_url
    button.download = asset.name
    button.classList.remove('disabled')
    button.removeAttribute('aria-disabled')
  })
  .catch(() => {
    title.textContent = 'الإصدار قيد التجهيز'
    detail.textContent = 'سيظهر التنزيل هنا فور نشر Installer حقيقي ومختبر.'
    message.textContent = 'لم يتم نشر Windows Installer رسمياً بعد. لن نعرض رابط تنزيل غير صالح.'
  })
