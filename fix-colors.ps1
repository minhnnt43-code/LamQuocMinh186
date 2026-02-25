$files = Get-ChildItem -Path "css" -Recurse -Filter "*.css"
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    if ($c -match '#667eea|#764ba2|#7c4dff|#5e35b1|#6c5ee0|#a5b4fc|#c4b5fd') {
        $c = $c -replace '#667eea', '#3b82f6'
        $c = $c -replace '#764ba2', '#1e40af'
        $c = $c -replace '#7c4dff', '#2563eb'
        $c = $c -replace '#5e35b1', '#1d4ed8'
        $c = $c -replace '#6c5ee0', '#3b82f6'
        $c = $c -replace '#a5b4fc', '#93c5fd'
        $c = $c -replace '#c4b5fd', '#93c5fd'
        $c = $c -replace '102, 126, 234', '59, 130, 246'
        $c = $c -replace '124, 77, 255', '37, 99, 235'
        $c = $c -replace '108, 94, 224', '59, 130, 246'
        Set-Content -Path $f.FullName -Value $c -NoNewline
        Write-Output "Updated: $($f.Name)"
    }
}
Write-Output "Done!"
