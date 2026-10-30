Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Add-Star {
    param(
        [System.Drawing.Drawing2D.GraphicsPath]$Path,
        [float]$CenterX,
        [float]$CenterY,
        [float]$OuterRadius,
        [float]$InnerRadius
    )

    $points = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    for ($i = 0; $i -lt 16; $i++) {
        $angle = (-90 + ($i * 22.5)) * [Math]::PI / 180
        $radius = if ($i % 2 -eq 0) { $OuterRadius } else { $InnerRadius }
        $point = New-Object System.Drawing.PointF(
            [float]($CenterX + $radius * [Math]::Cos($angle)),
            [float]($CenterY + $radius * [Math]::Sin($angle))
        )
        $points.Add($point)
    }
    $Path.AddPolygon($points.ToArray())
}

function New-AppIcon {
    param(
        [int]$Size,
        [string]$OutputPath,
        [float]$ArtScale
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $backgroundPath = New-RoundedRectPath 0 0 $Size $Size ([float]($Size * 0.21))
    $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 6, 43, 32),
        [System.Drawing.Color]::FromArgb(255, 17, 87, 65),
        52
    )
    $graphics.FillPath($backgroundBrush, $backgroundPath)

    $graphics.SetClip($backgroundPath)

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 201, 162, 39))
    $graphics.FillEllipse($glowBrush, [float]($Size * 0.56), [float](-$Size * 0.15), [float]($Size * 0.7), [float]($Size * 0.7))

    $scale = ($Size / 512.0) * $ArtScale
    $graphics.TranslateTransform([float]($Size / 2), [float]($Size / 2))
    $graphics.ScaleTransform([float]$scale, [float]$scale)
    $graphics.TranslateTransform(-256, -256)

    $decorPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(32, 231, 201, 112), 2.2)
    $graphics.DrawEllipse($decorPen, 56, 56, 400, 400)
    $decorPen.Width = 1.2
    $graphics.DrawEllipse($decorPen, 86, 86, 340, 340)

    $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-Star $starPath 256 134 38 15
    $starBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.RectangleF(210, 96, 92, 76)),
        [System.Drawing.Color]::FromArgb(255, 250, 236, 181),
        [System.Drawing.Color]::FromArgb(255, 207, 164, 48),
        90
    )
    $graphics.FillPath($starBrush, $starPath)

    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 0, 0, 0))
    $graphics.FillEllipse($shadowBrush, 118, 328, 276, 30)

    $bookBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.RectangleF(96, 190, 320, 160)),
        [System.Drawing.Color]::FromArgb(255, 252, 240, 191),
        [System.Drawing.Color]::FromArgb(255, 201, 162, 39),
        65
    )
    $bookPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 233, 207, 119), 3.2)

    $leftPage = New-Object System.Drawing.Drawing2D.GraphicsPath
    $leftPage.StartFigure()
    $leftPage.AddBezier(256, 338, 212, 324, 154, 315, 106, 322)
    $leftPage.AddLine(106, 322, 100, 207)
    $leftPage.AddBezier(100, 207, 154, 192, 214, 206, 256, 232)
    $leftPage.AddLine(256, 232, 256, 338)
    $leftPage.CloseFigure()
    $graphics.FillPath($bookBrush, $leftPage)
    $graphics.DrawPath($bookPen, $leftPage)

    $rightPage = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rightPage.StartFigure()
    $rightPage.AddBezier(256, 338, 300, 324, 358, 315, 406, 322)
    $rightPage.AddLine(406, 322, 412, 207)
    $rightPage.AddBezier(412, 207, 358, 192, 298, 206, 256, 232)
    $rightPage.AddLine(256, 232, 256, 338)
    $rightPage.CloseFigure()
    $graphics.FillPath($bookBrush, $rightPage)
    $graphics.DrawPath($bookPen, $rightPage)

    $spinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 9, 58, 43), 4.2)
    $graphics.DrawLine($spinePen, 256, 232, 256, 340)

    $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 9, 58, 43), 2.6)
    for ($i = 0; $i -lt 3; $i++) {
        $y = 255 + ($i * 24)
        $leftLine = New-Object System.Drawing.Drawing2D.GraphicsPath
        $leftLine.AddBezier(128, $y, 160, ($y - 5), 210, ($y - 3), 238, ($y + 8))
        $graphics.DrawPath($linePen, $leftLine)

        $rightLine = New-Object System.Drawing.Drawing2D.GraphicsPath
        $rightLine.AddBezier(384, $y, 352, ($y - 5), 302, ($y - 3), 274, ($y + 8))
        $graphics.DrawPath($linePen, $rightLine)
    }

    $graphics.ResetClip()

    $outputDirectory = Split-Path -Parent $OutputPath
    if (-not (Test-Path -LiteralPath $outputDirectory)) {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bitmap.Dispose()
    $backgroundBrush.Dispose()
    $backgroundPath.Dispose()
    $glowBrush.Dispose()
    $decorPen.Dispose()
    $starPath.Dispose()
    $starBrush.Dispose()
    $shadowBrush.Dispose()
    $bookBrush.Dispose()
    $bookPen.Dispose()
    $leftPage.Dispose()
    $rightPage.Dispose()
    $spinePen.Dispose()
    $linePen.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconDirectory = Join-Path $root "public\icons"

New-AppIcon 192 (Join-Path $iconDirectory "icon-192.png") 1.0
New-AppIcon 512 (Join-Path $iconDirectory "icon-512.png") 1.0
New-AppIcon 512 (Join-Path $iconDirectory "maskable-512.png") 0.75
New-AppIcon 180 (Join-Path $iconDirectory "apple-touch-icon.png") 1.0
New-AppIcon 32 (Join-Path $iconDirectory "favicon-32.png") 1.0

Write-Host "Created app icons in public/icons"
