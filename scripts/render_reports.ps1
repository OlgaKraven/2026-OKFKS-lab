param(
  [string]$InputDirectory = (Join-Path $PSScriptRoot '..\public\reports'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\_qa\report-renders'),
  [string]$PdfToPpm = 'C:\Users\gvadoskr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe'
)

$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path -LiteralPath $InputDirectory).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$outputPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
$files = Get-ChildItem -File -LiteralPath $inputPath -Filter 'LR??_template.docx' | Sort-Object Name
if ($files.Count -ne 22) { throw "Expected 22 DOCX files, found $($files.Count)." }
if (-not (Test-Path -LiteralPath $PdfToPpm)) { throw "pdftoppm not found: $PdfToPpm" }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($file in $files) {
    $labOut = Join-Path $outputPath $file.BaseName
    New-Item -ItemType Directory -Force -Path $labOut | Out-Null
    Get-ChildItem -File -LiteralPath $labOut -ErrorAction SilentlyContinue | Remove-Item -Force
    $pdf = Join-Path $labOut ($file.BaseName + '.pdf')
    $doc = $word.Documents.Open($file.FullName, $false, $true)
    try {
      $doc.Repaginate()
      $doc.ExportAsFixedFormat($pdf, 17)
    } finally {
      $doc.Close(0)
      [Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    }
    & $PdfToPpm -png -r 150 $pdf (Join-Path $labOut 'page') | Out-Null
    $pages = (Get-ChildItem -File -LiteralPath $labOut -Filter 'page-*.png').Count
    if ($pages -lt 2) { throw "Render failed for $($file.Name): $pages pages." }
    Write-Output "RENDERED $($file.Name) PAGES=$pages"
  }
} finally {
  $word.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
