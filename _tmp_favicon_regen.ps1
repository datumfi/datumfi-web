Add-Type -AssemblyName System.Drawing
$base = 'C:\Users\tmnte\datumfi-web'
$srcDir = $base + '\brand\icons-src\'

$s16 = [pscustomobject]@{ file='mark-d-16.png'; expW=16; expH=16; minH=14; maxH=16 }
$s32 = [pscustomobject]@{ file='mark-d-32.png'; expW=32; expH=32; minH=27; maxH=32 }
$s48 = [pscustomobject]@{ file='mark-d-48.png'; expW=48; expH=48; minH=41; maxH=48 }
$s64 = [pscustomobject]@{ file='mark-d-64.png'; expW=64; expH=64; minH=54; maxH=64 }
$sources = @($s16, $s32, $s48, $s64)

Write-Output '=== SOURCE PNG VERIFICATION ==='
$allPass = $true

foreach ($s in $sources) {
    $p = $srcDir + $s.file
    if (-not (Test-Path $p)) {
        Write-Output ('  NOT FOUND: ' + $s.file)
        $allPass = $false
        continue
    }
    $bmp = [System.Drawing.Bitmap]::new($p)
    $w = $bmp.Width
    $h = $bmp.Height
    $dimOK  = ($w -eq $s.expW -and $h -eq $s.expH)
    $tl     = $bmp.GetPixel(0,0)
    $navyOK = (($tl.A -eq 0) -or ($tl.R -eq 9 -and $tl.G -eq 18 -and $tl.B -eq 33))
    $cx = [int]($w / 2)
    $topRow = -1; $botRow = -1
    for ($y = 0; $y -lt $h; $y++) {
        $px   = $bmp.GetPixel($cx, $y)
        $skip = ($px.A -eq 0) -or ($px.R -eq 9 -and $px.G -eq 18 -and $px.B -eq 33)
        if (-not $skip) {
            if ($topRow -eq -1) { $topRow = $y }
            $botRow = $y
        }
    }
    $markH   = if ($topRow -ge 0) { $botRow - $topRow + 1 } else { 0 }
    $pct     = if ($h -gt 0) { [math]::Round($markH / $h * 100, 1) } else { 0 }
    $rangeOK = ($markH -ge $s.minH -and $markH -le $s.maxH)
    $mid     = if ($topRow -ge 0) { [int](($topRow + $botRow) / 2) } else { -1 }
    $centOK  = ($mid -ge 0 -and [math]::Abs($mid - [int]($h/2)) -le [math]::Max(2, [int]($h*0.05)))
    $passed  = $dimOK -and $rangeOK -and $navyOK
    if (-not $passed) { $allPass = $false }
    $line = '  ' + $s.file + ': ' + $w + 'x' + $h + ' dimOK=' + $dimOK + ' navy=' + $navyOK + ' D=' + $markH + 'px (' + $pct + '%) top=' + $topRow + ' bot=' + $botRow + ' target=' + $s.minH + '-' + $s.maxH + ' rangeOK=' + $rangeOK + ' centered=' + $centOK + ' PASS=' + $passed
    Write-Output $line
    $bmp.Dispose()
}
Write-Output ('  All pass: ' + $allPass)
Write-Output ''

if (-not $allPass) {
    Write-Output 'VERIFICATION FAILED - favicon.ico NOT regenerated.'
    exit 1
}

# --- Regenerate favicon.ico ---
Write-Output '=== REGENERATING FAVICON.ICO ==='
$p16 = $srcDir + 'mark-d-16.png'
$p32 = $srcDir + 'mark-d-32.png'
$p48 = $srcDir + 'mark-d-48.png'
$p64 = $srcDir + 'mark-d-64.png'
$pngFiles = @($p16, $p32, $p48, $p64)
$outPath  = $base + '\favicon.ico'

$images = @()
foreach ($pp in $pngFiles) {
    $data = [System.IO.File]::ReadAllBytes($pp)
    $pw   = ($data[16] -shl 24) -bor ($data[17] -shl 16) -bor ($data[18] -shl 8) -bor $data[19]
    $ph   = ($data[20] -shl 24) -bor ($data[21] -shl 16) -bor ($data[22] -shl 8) -bor $data[23]
    $leaf = [System.IO.Path]::GetFileName($pp)
    Write-Output ('  loaded: ' + $leaf + ' ' + $pw + 'x' + $ph + ' ' + $data.Length + ' bytes')
    $images += [pscustomobject]@{ W=$pw; H=$ph; Data=$data }
}

$n      = $images.Count
$offset = 6 + $n * 16
$ico    = [byte[]](0,0, 1,0, [byte]($n -band 0xFF), [byte](($n -shr 8) -band 0xFF))
$entries  = [System.Collections.Generic.List[byte]]::new()
$payloads = [System.Collections.Generic.List[byte]]::new()

foreach ($img in $images) {
    $wb = if ($img.W -lt 256) { [byte]$img.W } else { [byte]0 }
    $hb = if ($img.H -lt 256) { [byte]$img.H } else { [byte]0 }
    $sz = $img.Data.Length
    $entries.Add($wb); $entries.Add($hb); $entries.Add([byte]0); $entries.Add([byte]0)
    $entries.Add([byte]1); $entries.Add([byte]0)
    $entries.Add([byte]32); $entries.Add([byte]0)
    $entries.Add([byte]($sz -band 0xFF))
    $entries.Add([byte](($sz -shr 8) -band 0xFF))
    $entries.Add([byte](($sz -shr 16) -band 0xFF))
    $entries.Add([byte](($sz -shr 24) -band 0xFF))
    $entries.Add([byte]($offset -band 0xFF))
    $entries.Add([byte](($offset -shr 8) -band 0xFF))
    $entries.Add([byte](($offset -shr 16) -band 0xFF))
    $entries.Add([byte](($offset -shr 24) -band 0xFF))
    foreach ($b in $img.Data) { $payloads.Add($b) }
    $offset += $sz
}

$result = [byte[]]($ico + $entries.ToArray() + $payloads.ToArray())
[System.IO.File]::WriteAllBytes($outPath, $result)
Write-Output ('  Written favicon.ico: ' + $result.Length + ' bytes')
Write-Output ''

# --- Validate ICO ---
Write-Output '=== FAVICON.ICO VALIDATION ==='
$icoBytes = [System.IO.File]::ReadAllBytes($outPath)
$cnt = [BitConverter]::ToUInt16($icoBytes, 4)
Write-Output ('  File size:   ' + $icoBytes.Length + ' bytes')
Write-Output ('  Image count: ' + $cnt)
for ($i = 0; $i -lt $cnt; $i++) {
    $b     = 6 + $i * 16
    $dw    = $icoBytes[$b];   if ($dw -eq 0) { $dw = 256 }
    $dh    = $icoBytes[$b+1]; if ($dh -eq 0) { $dh = 256 }
    $dsz   = [BitConverter]::ToUInt32($icoBytes, $b+8)
    $off   = [BitConverter]::ToUInt32($icoBytes, $b+12)
    $isPng = ($icoBytes[$off] -eq 0x89 -and $icoBytes[$off+1] -eq 0x50)
    Write-Output ('  slot ' + ($i+1) + ': ' + $dw + 'x' + $dh + '  PNG=' + $isPng + '  ' + $dsz + ' bytes  offset=' + $off)
}
Write-Output ''

# --- Git status ---
Write-Output '=== GIT STATUS ==='
$f1 = 'favicon.ico'
$f2 = 'brand/icons-src/mark-d-16.png'
$f3 = 'brand/icons-src/mark-d-32.png'
$f4 = 'brand/icons-src/mark-d-48.png'
$f5 = 'brand/icons-src/mark-d-64.png'
$checkFiles = @($f1,$f2,$f3,$f4,$f5)
foreach ($f in $checkFiles) {
    $st = git -C $base status --short -- $f
    if ($st) {
        Write-Output ('  ' + $st)
    } else {
        Write-Output ('  clean: ' + $f)
    }
}
