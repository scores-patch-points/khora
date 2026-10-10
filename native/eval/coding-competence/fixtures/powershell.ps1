# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
Import-Module Pester
using namespace System.Text

class Shape {
    [double]$R
    [double] Area() { return 3.14159 * $this.R * $this.R }
}

class Circle : Shape {
    [string] Describe() { return "area=$($this.Area())" }
}

function Get-Area {
    param([double]$R)
    return 3.14159 * $R * $R
}

$c = [Circle]::new()
Write-Host (Get-Area -R 2.0)
