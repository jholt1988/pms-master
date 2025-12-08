<#
.Synopsis
Activate a Python virtual environment for the current PowerShell session.

.Description
Pushes the python executable for a virtual environment to the front of the
$Env:PATH environment variable and sets the prompt to signify that you are
in a Python virtual environment. Makes use of the command line switches as
well as the `pyvenv.cfg` file values present in the virtual environment.

.Parameter VenvDir
Path to the directory that contains the virtual environment to activate. The
default value for this is the parent of the directory that the Activate.ps1
script is located within.

.Parameter Prompt
The prompt prefix to display when this virtual environment is activated. By
default, this prompt is the name of the virtual environment folder (VenvDir)
surrounded by parentheses and followed by a single space (ie. '(.venv) ').

.Example
Activate.ps1
Activates the Python virtual environment that contains the Activate.ps1 script.

.Example
Activate.ps1 -Verbose
Activates the Python virtual environment that contains the Activate.ps1 script,
and shows extra information about the activation as it executes.

.Example
Activate.ps1 -VenvDir C:\Users\MyUser\Common\.venv
Activates the Python virtual environment located in the specified location.

.Example
Activate.ps1 -Prompt "MyPython"
Activates the Python virtual environment that contains the Activate.ps1 script,
and prefixes the current prompt with the specified string (surrounded in
parentheses) while the virtual environment is active.

.Notes
On Windows, it may be required to enable this Activate.ps1 script by setting the
execution policy for the user. You can do this by issuing the following PowerShell
command:

PS C:\> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

For more information on Execution Policies: 
https://go.microsoft.com/fwlink/?LinkID=135170

#>
Param(
    [Parameter(Mandatory = $false)]
    [String]
    $VenvDir,
    [Parameter(Mandatory = $false)]
    [String]
    $Prompt
)

<# Function declarations --------------------------------------------------- #>

<#
.Synopsis
Remove all shell session elements added by the Activate script, including the
addition of the virtual environment's Python executable from the beginning of
the PATH variable.

.Parameter NonDestructive
If present, do not remove this function from the global namespace for the
session.

#>
function global:deactivate ([switch]$NonDestructive) {
    # Revert to original values

    # The prior prompt:
    if (Test-Path -Path Function:_OLD_VIRTUAL_PROMPT) {
        Copy-Item -Path Function:_OLD_VIRTUAL_PROMPT -Destination Function:prompt
        Remove-Item -Path Function:_OLD_VIRTUAL_PROMPT
    }

    # The prior PYTHONHOME:
    if (Test-Path -Path Env:_OLD_VIRTUAL_PYTHONHOME) {
        Copy-Item -Path Env:_OLD_VIRTUAL_PYTHONHOME -Destination Env:PYTHONHOME
        Remove-Item -Path Env:_OLD_VIRTUAL_PYTHONHOME
    }

    # The prior PATH:
    if (Test-Path -Path Env:_OLD_VIRTUAL_PATH) {
        Copy-Item -Path Env:_OLD_VIRTUAL_PATH -Destination Env:PATH
        Remove-Item -Path Env:_OLD_VIRTUAL_PATH
    }

    # Just remove the VIRTUAL_ENV altogether:
    if (Test-Path -Path Env:VIRTUAL_ENV) {
        Remove-Item -Path env:VIRTUAL_ENV
    }

    # Just remove VIRTUAL_ENV_PROMPT altogether.
    if (Test-Path -Path Env:VIRTUAL_ENV_PROMPT) {
        Remove-Item -Path env:VIRTUAL_ENV_PROMPT
    }

    # Just remove the _PYTHON_VENV_PROMPT_PREFIX altogether:
    if (Get-Variable -Name "_PYTHON_VENV_PROMPT_PREFIX" -ErrorAction SilentlyContinue) {
        Remove-Variable -Name _PYTHON_VENV_PROMPT_PREFIX -Scope Global -Force
    }

    # Leave deactivate function in the global namespace if requested:
    if (-not $NonDestructive) {
        Remove-Item -Path function:deactivate
    }
}

<#
.Description
Get-PyVenvConfig parses the values from the pyvenv.cfg file located in the
given folder, and returns them in a map.

For each line in the pyvenv.cfg file, if that line can be parsed into exactly
two strings separated by `=` (with any amount of whitespace surrounding the =)
then it is considered a `key = value` line. The left hand string is the key,
the right hand is the value.

If the value starts with a `'` or a `"` then the first and last character is
stripped from the value before being captured.

.Parameter ConfigDir
Path to the directory that contains the `pyvenv.cfg` file.
#>
function Get-PyVenvConfig(
    [String]
    $ConfigDir
) {
    Write-Verbose "Given ConfigDir=$ConfigDir, obtain values in pyvenv.cfg"

    # Ensure the file exists, and issue a warning if it doesn't (but still allow the function to continue).
    $pyvenvConfigPath = Join-Path -Resolve -Path $ConfigDir -ChildPath 'pyvenv.cfg' -ErrorAction Continue

    # An empty map will be returned if no config file is found.
    $pyvenvConfig = @{ }

    if ($pyvenvConfigPath) {

        Write-Verbose "File exists, parse `key = value` lines"
        $pyvenvConfigContent = Get-Content -Path $pyvenvConfigPath

        $pyvenvConfigContent | ForEach-Object {
            $keyval = $PSItem -split "\s*=\s*", 2
            if ($keyval[0] -and $keyval[1]) {
                $val = $keyval[1]

                # Remove extraneous quotations around a string value.
                if ("'""".Contains($val.Substring(0, 1))) {
                    $val = $val.Substring(1, $val.Length - 2)
                }

                $pyvenvConfig[$keyval[0]] = $val
                Write-Verbose "Adding Key: '$($keyval[0])'='$val'"
            }
        }
    }
    return $pyvenvConfig
}


<# Begin Activate script --------------------------------------------------- #>

# Determine the containing directory of this script
$VenvExecPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$VenvExecDir = Get-Item -Path $VenvExecPath

Write-Verbose "Activation script is located in path: '$VenvExecPath'"
Write-Verbose "VenvExecDir Fullname: '$($VenvExecDir.FullName)"
Write-Verbose "VenvExecDir Name: '$($VenvExecDir.Name)"

# Set values required in priority: CmdLine, ConfigFile, Default
# First, get the location of the virtual environment, it might not be
# VenvExecDir if specified on the command line.
if ($VenvDir) {
    Write-Verbose "VenvDir given as parameter, using '$VenvDir' to determine values"
}
else {
    Write-Verbose "VenvDir not given as a parameter, using parent directory name as VenvDir."
    $VenvDir = $VenvExecDir.Parent.FullName.TrimEnd("\\/")
    Write-Verbose "VenvDir=$VenvDir"
}

# Next, read the `pyvenv.cfg` file to determine any required value such
# as `prompt`.
$pyvenvCfg = Get-PyVenvConfig -ConfigDir $VenvDir

# Next, set the prompt from the command line, or the config file, or
# just use the name of the virtual environment folder.
if ($Prompt) {
    Write-Verbose "Prompt specified as argument, using '$Prompt'"
}
else {
    Write-Verbose "Prompt not specified as argument to script, checking pyvenv.cfg value"
    if ($pyvenvCfg -and $pyvenvCfg['prompt']) {
        Write-Verbose "  Setting based on value in pyvenv.cfg='$($pyvenvCfg['prompt'])'"
        $Prompt = $pyvenvCfg['prompt'];
    }
    else {
        Write-Verbose "  Setting prompt based on parent's directory's name. (Is the directory name passed to venv module when creating the virtual environment)"
        Write-Verbose "  Got leaf-name of $VenvDir='$(Split-Path -Path $venvDir -Leaf)'"
        $Prompt = Split-Path -Path $venvDir -Leaf
    }
}

Write-Verbose "Prompt = '$Prompt'"
Write-Verbose "VenvDir='$VenvDir'"

# Deactivate any currently active virtual environment, but leave the
# deactivate function in place.
deactivate -nondestructive

# Now set the environment variable VIRTUAL_ENV, used by many tools to determine
# that there is an activated venv.
$env:VIRTUAL_ENV = $VenvDir

$env:VIRTUAL_ENV_PROMPT = $Prompt

if (-not $Env:VIRTUAL_ENV_DISABLE_PROMPT) {

    Write-Verbose "Setting prompt to '$Prompt'"

    # Set the prompt to include the env name
    # Make sure _OLD_VIRTUAL_PROMPT is global
    function global:_OLD_VIRTUAL_PROMPT { "" }
    Copy-Item -Path function:prompt -Destination function:_OLD_VIRTUAL_PROMPT
    New-Variable -Name _PYTHON_VENV_PROMPT_PREFIX -Description "Python virtual environment prompt prefix" -Scope Global -Option ReadOnly -Visibility Public -Value $Prompt

    function global:prompt {
        Write-Host -NoNewline -ForegroundColor Green "($_PYTHON_VENV_PROMPT_PREFIX) "
        _OLD_VIRTUAL_PROMPT
    }
}

# Clear PYTHONHOME
if (Test-Path -Path Env:PYTHONHOME) {
    Copy-Item -Path Env:PYTHONHOME -Destination Env:_OLD_VIRTUAL_PYTHONHOME
    Remove-Item -Path Env:PYTHONHOME
}

# Add the venv to the PATH
Copy-Item -Path Env:PATH -Destination Env:_OLD_VIRTUAL_PATH
$Env:PATH = "$VenvExecDir$([System.IO.Path]::PathSeparator)$Env:PATH"

# SIG # Begin signature block
# MII3YgYJKoZIhvcNAQcCoII3UzCCN08CAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCBALKwKRFIhr2RY
# IW/WJLd9pc8a9sj/IoThKU92fTfKsKCCG9IwggXMMIIDtKADAgECAhBUmNLR1FsZ
# lUgTecgRwIeZMA0GCSqGSIb3DQEBDAUAMHcxCzAJBgNVBAYTAlVTMR4wHAYDVQQK
# ExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xSDBGBgNVBAMTP01pY3Jvc29mdCBJZGVu
# dGl0eSBWZXJpZmljYXRpb24gUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgMjAy
# MDAeFw0yMDA0MTYxODM2MTZaFw00NTA0MTYxODQ0NDBaMHcxCzAJBgNVBAYTAlVT
# MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xSDBGBgNVBAMTP01pY3Jv
# c29mdCBJZGVudGl0eSBWZXJpZmljYXRpb24gUm9vdCBDZXJ0aWZpY2F0ZSBBdXRo
# b3JpdHkgMjAyMDCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBALORKgeD
# Bmf9np3gx8C3pOZCBH8Ppttf+9Va10Wg+3cL8IDzpm1aTXlT2KCGhFdFIMeiVPvH
# or+Kx24186IVxC9O40qFlkkN/76Z2BT2vCcH7kKbK/ULkgbk/WkTZaiRcvKYhOuD
# PQ7k13ESSCHLDe32R0m3m/nJxxe2hE//uKya13NnSYXjhr03QNAlhtTetcJtYmrV
# qXi8LW9J+eVsFBT9FMfTZRY33stuvF4pjf1imxUs1gXmuYkyM6Nix9fWUmcIxC70
# ViueC4fM7Ke0pqrrBc0ZV6U6CwQnHJFnni1iLS8evtrAIMsEGcoz+4m+mOJyoHI1
# vnnhnINv5G0Xb5DzPQCGdTiO0OBJmrvb0/gwytVXiGhNctO/bX9x2P29Da6SZEi3
# W295JrXNm5UhhNHvDzI9e1eM80UHTHzgXhgONXaLbZ7LNnSrBfjgc10yVpRnlyUK
# xjU9lJfnwUSLgP3B+PR0GeUw9gb7IVc+BhyLaxWGJ0l7gpPKWeh1R+g/OPTHU3mg
# trTiXFHvvV84wRPmeAyVWi7FQFkozA8kwOy6CXcjmTimthzax7ogttc32H83rwjj
# O3HbbnMbfZlysOSGM1l0tRYAe1BtxoYT2v3EOYI9JACaYNq6lMAFUSw0rFCZE4e7
# swWAsk0wAly4JoNdtGNz764jlU9gKL431VulAgMBAAGjVDBSMA4GA1UdDwEB/wQE
# AwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTIftJqhSobyhmYBAcnz1AQ
# T2ioojAQBgkrBgEEAYI3FQEEAwIBADANBgkqhkiG9w0BAQwFAAOCAgEAr2rd5hnn
# LZRDGU7L6VCVZKUDkQKL4jaAOxWiUsIWGbZqWl10QzD0m/9gdAmxIR6QFm3FJI9c
# Zohj9E/MffISTEAQiwGf2qnIrvKVG8+dBetJPnSgaFvlVixlHIJ+U9pW2UYXeZJF
# xBA2CFIpF8svpvJ+1Gkkih6PsHMNzBxKq7Kq7aeRYwFkIqgyuH4yKLNncy2RtNwx
# AQv3Rwqm8ddK7VZgxCwIo3tAsLx0J1KH1r6I3TeKiW5niB31yV2g/rarOoDXGpc8
# FzYiQR6sTdWD5jw4vU8w6VSp07YEwzJ2YbuwGMUrGLPAgNW3lbBeUU0i/OxYqujY
# lLSlLu2S3ucYfCFX3VVj979tzR/SpncocMfiWzpbCNJbTsgAlrPhgzavhgplXHT2
# 6ux6anSg8Evu75SjrFDyh+3XOjCDyft9V77l4/hByuVkrrOj7FjshZrM77nq81YY
# uVxzmq/FdxeDWds3GhhyVKVB0rYjdaNDmuV3fJZ5t0GNv+zcgKCf0Xd1WF81E+Al
# GmcLfc4l+gcK5GEh2NQc5QfGNpn0ltDGFf5Ozdeui53bFv0ExpK91IjmqaOqu/dk
# ODtfzAzQNb50GQOmxapMomE2gj4d8yu8l13bS3g7LfU772Aj6PXsCyM2la+YZr9T
# 03u4aUoqlmZpxJTG9F9urJh4iIAGXKKy7aIwggb+MIIE5qADAgECAhMzAAaG54Uj
# G2MsjxhlAAAABobnMA0GCSqGSIb3DQEBDAUAMFoxCzAJBgNVBAYTAlVTMR4wHAYD
# VQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xKzApBgNVBAMTIk1pY3Jvc29mdCBJ
# RCBWZXJpZmllZCBDUyBBT0MgQ0EgMDEwHhcNMjUxMjAyMTA1NzM4WhcNMjUxMjA1
# MTA1NzM4WjB8MQswCQYDVQQGEwJVUzEPMA0GA1UECBMGT3JlZ29uMRIwEAYDVQQH
# EwlCZWF2ZXJ0b24xIzAhBgNVBAoTGlB5dGhvbiBTb2Z0d2FyZSBGb3VuZGF0aW9u
# MSMwIQYDVQQDExpQeXRob24gU29mdHdhcmUgRm91bmRhdGlvbjCCAaIwDQYJKoZI
# hvcNAQEBBQADggGPADCCAYoCggGBANz1ICRC0wtsSaWoVlmuUu3+uDTJ7ug8SGpC
# eTpHfWrWs3UaiV5LbB/2IHlo8DZSLODdI1tF+b3XruyEkQXtIWe4Cmw75aVBz1gI
# XYEGXMvn2W975VaNqJAHatkWQV60f36HSkYpK9gNUqSUHSMgtCqvhRHniVFsBQz8
# BRfZwGrLSiDW+5O8Ta3ibUxHzkLvLR7ZQB4lxJIBNuPDVr6fPVFtk2IifnuXguFr
# kOsm29SABmP3/hVCADc17YNI67b54NcceFIJeopeAwi7skt6IsKUntMUOnPlokqK
# erfbxgkUJY06XxMEepz7WE8vysR2VelhTRq+B3iINW6OPDWP7sfgAbRtRs+OKooo
# QpKCWIlPi6CLMipGCDSeW+9Z7qQoEjVjAkwYEIs1eKPRRiMLmU4tkzOAM+FQvkUo
# KtPHN1r9teO9Ogt5782mJ1vkIhAOcoICVgoLcfSm9BGpXpsPNuPdqtVoNVBhcCXf
# 2xC2MGs2wD7texOkK6Y6clYsATXXnwIDAQABo4ICGTCCAhUwDAYDVR0TAQH/BAIw
# ADAOBgNVHQ8BAf8EBAMCB4AwPAYDVR0lBDUwMwYKKwYBBAGCN2EBAAYIKwYBBQUH
# AwMGGysGAQQBgjdhgqKNuwqmkohkgZH0oEWCk/3hbzAdBgNVHQ4EFgQUA/xIkosO
# g0FXw2c2lmsavFy8910wHwYDVR0jBBgwFoAU6IPEM9fcnwycdpoKptTfh6ZeWO4w
# ZwYDVR0fBGAwXjBcoFqgWIZWaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9w
# cy9jcmwvTWljcm9zb2Z0JTIwSUQlMjBWZXJpZmllZCUyMENTJTIwQU9DJTIwQ0El
# MjAwMS5jcmwwgaUGCCsGAQUFBwEBBIGYMIGVMGQGCCsGAQUFBzAChlhodHRwOi8v
# d3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NlcnRzL01pY3Jvc29mdCUyMElEJTIw
# VmVyaWZpZWQlMjBDUyUyMEFPQyUyMENBJTIwMDEuY3J0MC0GCCsGAQUFBzABhiFo
# dHRwOi8vb25lb2NzcC5taWNyb3NvZnQuY29tL29jc3AwZgYDVR0gBF8wXTBRBgwr
# BgEEAYI3TIN9AQEwQTA/BggrBgEFBQcCARYzaHR0cDovL3d3dy5taWNyb3NvZnQu
# Y29tL3BraW9wcy9Eb2NzL1JlcG9zaXRvcnkuaHRtMAgGBmeBDAEEATANBgkqhkiG
# 9w0BAQwFAAOCAgEAkBajP6jp7D6kU4hBEvFCnF0JZW7miJYSqlVneaUS52ueozjJ
# dh3ZEPUz+2mpO/nnrCtttH7oa8i0K3acx6rIkwVv9LP+zIz80zcIgTaMlsfPj4k0
# bgKOvoyvgRiEy9nJu5qvVOihVXf8cb1P+xRuAWxm7KuS9VoPkGMqxL+GHMjMk5S2
# xjMReAu2D/66GjTihVmXjiGq5XH7pPInv64JS7yuREM8Y5i5rmicKdWGq/8/HtCY
# DgB83FG+FG4gfwegEKso/zpdl4noZI5koDcQ3vvi/CoP0WCn3A+EwGf8drJmJVJN
# 1ycr2Yyg8osAISv/mzxXQrw8s5B1YytoUpPMWNheQjcC6kzD/LnYqq+tbgXULMFc
# xz67X1T7O3wq1xm4Ryw9lRHi1qC+8NSXhFeKuXbt6OmucOsujUzfD6pan1wmpHty
# bKYphh67JjHDWqiMKIB2ks09JilpJLV9J+hfEJkow93K/I0JmdPkmjlqP8690aXP
# BobMfJ3rHU+HzSZj3seLlBmyY6ktl6EvRt//DINlCZVc02M9WVH8DMyAGI8GBPku
# 4+WWrOlaMFKKtG2lBubzbQkcF70gaNvU69m517TsGA+5wnfTOGtVeajA8tjmhtbS
# MlcFJ6ANwcrvdwzGE0xTWVUW7wLhcUKDKcyNwLKZt5caWfiB6y6QIZ67D/swggda
# MIIFQqADAgECAhMzAAAABzeMW6HZW4zUAAAAAAAHMA0GCSqGSIb3DQEBDAUAMGMx
# CzAJBgNVBAYTAlVTMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xNDAy
# BgNVBAMTK01pY3Jvc29mdCBJRCBWZXJpZmllZCBDb2RlIFNpZ25pbmcgUENBIDIw
# MjEwHhcNMjEwNDEzMTczMTU0WhcNMjYwNDEzMTczMTU0WjBaMQswCQYDVQQGEwJV
# UzEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSswKQYDVQQDEyJNaWNy
# b3NvZnQgSUQgVmVyaWZpZWQgQ1MgQU9DIENBIDAxMIICIjANBgkqhkiG9w0BAQEF
# AAOCAg8AMIICCgKCAgEAt/fAAygHxbo+jxA04hNI8bz+EqbWvSu9dRgAawjCZau1
# Y54IQal5ArpJWi8cIj0WA+mpwix8iTRguq9JELZvTMo2Z1U6AtE1Tn3mvq3mywZ9
# SexVd+rPOTr+uda6GVgwLA80LhRf82AvrSwxmZpCH/laT08dn7+Gt0cXYVNKJORm
# 1hSrAjjDQiZ1Jiq/SqiDoHN6PGmT5hXKs22E79MeFWYB4y0UlNqW0Z2LPNua8k0r
# bERdiNS+nTP/xsESZUnrbmyXZaHvcyEKYK85WBz3Sr6Et8Vlbdid/pjBpcHI+Hyt
# oaUAGE6rSWqmh7/aEZeDDUkz9uMKOGasIgYnenUk5E0b2U//bQqDv3qdhj9UJYWA
# DNYC/3i3ixcW1VELaU+wTqXTxLAFelCi/lRHSjaWipDeE/TbBb0zTCiLnc9nmOjZ
# PKlutMNho91wxo4itcJoIk2bPot9t+AV+UwNaDRIbcEaQaBycl9pcYwWmf0bJ4IF
# n/CmYMVG1ekCBxByyRNkFkHmuMXLX6PMXcveE46jMr9syC3M8JHRddR4zVjd/FxB
# nS5HOro3pg6StuEPshrp7I/Kk1cTG8yOWl8aqf6OJeAVyG4lyJ9V+ZxClYmaU5yv
# tKYKk1FLBnEBfDWw+UAzQV0vcLp6AVx2Fc8n0vpoyudr3SwZmckJuz7R+S79BzMC
# AwEAAaOCAg4wggIKMA4GA1UdDwEB/wQEAwIBhjAQBgkrBgEEAYI3FQEEAwIBADAd
# BgNVHQ4EFgQU6IPEM9fcnwycdpoKptTfh6ZeWO4wVAYDVR0gBE0wSzBJBgRVHSAA
# MEEwPwYIKwYBBQUHAgEWM2h0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMv
# RG9jcy9SZXBvc2l0b3J5Lmh0bTAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTAS
# BgNVHRMBAf8ECDAGAQH/AgEAMB8GA1UdIwQYMBaAFNlBKbAPD2Ns72nX9c0pnqRI
# ajDmMHAGA1UdHwRpMGcwZaBjoGGGX2h0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9w
# a2lvcHMvY3JsL01pY3Jvc29mdCUyMElEJTIwVmVyaWZpZWQlMjBDb2RlJTIwU2ln
# bmluZyUyMFBDQSUyMDIwMjEuY3JsMIGuBggrBgEFBQcBAQSBoTCBnjBtBggrBgEF
# BQcwAoZhaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNy
# b3NvZnQlMjBJRCUyMFZlcmlmaWVkJTIwQ29kZSUyMFNpZ25pbmclMjBQQ0ElMjAy
# MDIxLmNydDAtBggrBgEFBQcwAYYhaHR0cDovL29uZW9jc3AubWljcm9zb2Z0LmNv
# bS9vY3NwMA0GCSqGSIb3DQEBDAUAA4ICAQB3/utLItkwLTp4Nfh99vrbpSsL8NwP
# Ij2+TBnZGL3C8etTGYs+HZUxNG+rNeZa+Rzu9oEcAZJDiGjEWytzMavD6Bih3nEW
# FsIW4aGh4gB4n/pRPeeVrK4i1LG7jJ3kPLRhNOHZiLUQtmrF4V6IxtUFjvBnijaZ
# 9oIxsSSQP8iHMjP92pjQrHBFWHGDbkmx+yO6Ian3QN3YmbdfewzSvnQmKbkiTibJ
# gcJ1L0TZ7BwmsDvm+0XRsPOfFgnzhLVqZdEyWww10bflOeBKqkb3SaCNQTz8nsha
# UZhrxVU5qNgYjaaDQQm+P2SEpBF7RolEC3lllfuL4AOGCtoNdPOWrx9vBZTXAVdT
# E2r0IDk8+5y1kLGTLKzmNFn6kVCc5BddM7xoDWQ4aUoCRXcsBeRhsclk7kVXP+zJ
# GPOXwjUJbnz2Kt9iF/8B6FDO4blGuGrogMpyXkuwCC2Z4XcfyMjPDhqZYAPGGTUI
# NMtFbau5RtGG1DOWE9edCahtuPMDgByfPixvhy3sn7zUHgIC/YsOTMxVuMQi/bga
# memo/VNKZrsZaS0nzmOxKpg9qDefj5fJ9gIHXcp2F0OHcVwe3KnEXa8kqzMDfrRl
# /wwKrNSFn3p7g0b44Ad1ONDmWt61MLQvF54LG62i6ffhTCeoFT9Z9pbUo2gxlyTF
# g7Bm0fgOlnRfGDCCB54wggWGoAMCAQICEzMAAAAHh6M0o3uljhwAAAAAAAcwDQYJ
# KoZIhvcNAQEMBQAwdzELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBD
# b3Jwb3JhdGlvbjFIMEYGA1UEAxM/TWljcm9zb2Z0IElkZW50aXR5IFZlcmlmaWNh
# dGlvbiBSb290IENlcnRpZmljYXRlIEF1dGhvcml0eSAyMDIwMB4XDTIxMDQwMTIw
# MDUyMFoXDTM2MDQwMTIwMTUyMFowYzELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1p
# Y3Jvc29mdCBDb3Jwb3JhdGlvbjE0MDIGA1UEAxMrTWljcm9zb2Z0IElEIFZlcmlm
# aWVkIENvZGUgU2lnbmluZyBQQ0EgMjAyMTCCAiIwDQYJKoZIhvcNAQEBBQADggIP
# ADCCAgoCggIBALLwwK8ZiCji3VR6TElsaQhVCbRS/3pK+MHrJSj3Zxd3KU3rlfL3
# qrZilYKJNqztA9OQacr1AwoNcHbKBLbsQAhBnIB34zxf52bDpIO3NJlfIaTE/xrw
# eLoQ71lzCHkD7A4As1Bs076Iu+mA6cQzsYYH/Cbl1icwQ6C65rU4V9NQhNUwgrx9
# rGQ//h890Q8JdjLLw0nV+ayQ2Fbkd242o9kH82RZsH3HEyqjAB5a8+Ae2nPIPc8s
# ZU6ZE7iRrRZywRmrKDp5+TcmJX9MRff241UaOBs4NmHOyke8oU1TYrkxh+YeHgfW
# o5tTgkoSMoayqoDpHOLJs+qG8Tvh8SnifW2Jj3+ii11TS8/FGngEaNAWrbyfNrC6
# 9oKpRQXY9bGH6jn9NEJv9weFxhTwyvx9OJLXmRGbAUXN1U9nf4lXezky6Uh/cgjk
# Vd6CGUAf0K+Jw+GE/5VpIVbcNr9rNE50Sbmy/4RTCEGvOq3GhjITbCa4crCzTTHg
# YYjHs1NbOc6brH+eKpWLtr+bGecy9CrwQyx7S/BfYJ+ozst7+yZtG2wR461uckFu
# 0t+gCwLdN0A6cFtSRtR8bvxVFyWwTtgMMFRuBa3vmUOTnfKLsLefRaQcVTgRnzeL
# zdpt32cdYKp+dhr2ogc+qM6K4CBI5/j4VFyC4QFeUP2YAidLtvpXRRo3AgMBAAGj
# ggI1MIICMTAOBgNVHQ8BAf8EBAMCAYYwEAYJKwYBBAGCNxUBBAMCAQAwHQYDVR0O
# BBYEFNlBKbAPD2Ns72nX9c0pnqRIajDmMFQGA1UdIARNMEswSQYEVR0gADBBMD8G
# CCsGAQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL0RvY3Mv
# UmVwb3NpdG9yeS5odG0wGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwDwYDVR0T
# AQH/BAUwAwEB/zAfBgNVHSMEGDAWgBTIftJqhSobyhmYBAcnz1AQT2ioojCBhAYD
# VR0fBH0wezB5oHegdYZzaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9j
# cmwvTWljcm9zb2Z0JTIwSWRlbnRpdHklMjBWZXJpZmljYXRpb24lMjBSb290JTIw
# Q2VydGlmaWNhdGUlMjBBdXRob3JpdHklMjAyMDIwLmNybDCBwwYIKwYBBQUHAQEE
# gbYwgbMwgYEGCCsGAQUFBzAChnVodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtp
# b3BzL2NlcnRzL01pY3Jvc29mdCUyMElkZW50aXR5JTIwVmVyaWZpY2F0aW9uJTIw
# Um9vdCUyMENlcnRpZmljYXRlJTIwQXV0aG9yaXR5JTIwMjAyMC5jcnQwLQYIKwYB
# BQUHMAGGIWh0dHA6Ly9vbmVvY3NwLm1pY3Jvc29mdC5jb20vb2NzcDANBgkqhkiG
# 9w0BAQwFAAOCAgEAfyUqnv7Uq+rdZgrbVyNMul5skONbhls5fccPlmIbzi+OwVdP
# Q4H55v7VOInnmezQEeW4LqK0wja+fBznANbXLB0KrdMCbHQpbLvG6UA/Xv2pfpVI
# E1CRFfNF4XKO8XYEa3oW8oVH+KZHgIQRIwAbyFKQ9iyj4aOWeAzwk+f9E5StNp5T
# 8FG7/VEURIVWArbAzPt9ThVN3w1fAZkF7+YU9kbq1bCR2YD+MtunSQ1Rft6XG7b4
# e0ejRA7mB2IoX5hNh3UEauY0byxNRG+fT2MCEhQl9g2i2fs6VOG19CNep7SquKaB
# jhWmirYyANb0RJSLWjinMLXNOAga10n8i9jqeprzSMU5ODmrMCJE12xS/NWShg/t
# uLjAsKP6SzYZ+1Ry358ZTFcx0FS/mx2vSoU8s8HRvy+rnXqyUJ9HBqS0DErVLjQw
# K8VtsBdekBmdTbQVoCgPCqr+PDPB3xajYnzevs7eidBsM71PINK2BoE2UfMwxCCX
# 3mccFgx6UsQeRSdVVVNSyALQe6PT12418xon2iDGE81OGCreLzDcMAZnrUAx4XQL
# Uz6ZTl65yPUiOh3k7Yww94lDf+8oG2oZmDh5O1Qe38E+M3vhKwmzIeoB1dVLlz4i
# 3IpaDcR+iuGjH2TdaC1ZOmBXiCRKJLj4DT2uhJ04ji+tHD6n58vhavFIrmcxghrm
# MIIa4gIBATBxMFoxCzAJBgNVBAYTAlVTMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
# cG9yYXRpb24xKzApBgNVBAMTIk1pY3Jvc29mdCBJRCBWZXJpZmllZCBDUyBBT0Mg
# Q0EgMDECEzMABobnhSMbYyyPGGUAAAAGhucwDQYJYIZIAWUDBAIBBQCggbIwGQYJ
# KoZIhvcNAQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEOMAwGCisGAQQB
# gjcCARUwLwYJKoZIhvcNAQkEMSIEICpXe3RS3b2coD0CJveEHlglqtPUYZ2FqSrO
# UfP6C6Y4MEYGCisGAQQBgjcCAQwxODA2oDCALgBQAHkAdABoAG8AbgAgADMALgAx
# ADQALgAxACAAKAA1ADcAZQAwAGQAMQA3ACmhAoAAMA0GCSqGSIb3DQEBAQUABIIB
# gFkjOjkFBXytJ5AYkZ/qJhjLjK3TGT9CJOFAzirq5flm7gg2Yk7ZkwIHq5xLWYxU
# bB+yvSXv7UWL+E9LbhJLa6Usz5YI1CnEnGlYSYYWn1LNtqvVLSttw6kXIFRYqYg7
# Z3nBe6Qnz9pHMOdiRomf6kOzghLwfEFiE2RGW08oFO0uwphEFJRwEIKwRaBV5MSb
# SqFnvigeQGe961hsVwo6x+38JfVYHGA6ymqQs8ieWvSIn+CgpgOSFcP3mA53b5um
# D3Vjeqx94vvp+urEeU3IHbLErFKui3SOFcpUNyjLaA1kyoFbBvynJj6RQ3+wbu/4
# 54AM2vmvT27riYOWVGfkuZA4x3VbvWfyD9LM6UucJYj9R0teq4WxyIvH3uso3aBQ
# T6kQYaxpUHQrZd9vA9oZzu7bYCJSjS1wPUufcM0Gn6hG9M8l06J3p0GRjd60lBw7
# ZU9WvrwfLHWaYx4C7OzM3lt8+R1pmd1BafUAqk5APxmhCXVUBn3ubINQzHgyYezq
# yKGCGBEwghgNBgorBgEEAYI3AwMBMYIX/TCCF/kGCSqGSIb3DQEHAqCCF+owghfm
# AgEDMQ8wDQYJYIZIAWUDBAIBBQAwggFiBgsqhkiG9w0BCRABBKCCAVEEggFNMIIB
# SQIBAQYKKwYBBAGEWQoDATAxMA0GCWCGSAFlAwQCAQUABCCO3o2+cSZE2VOl/UpX
# RMI1CA+BG1jic3RCjQ6YgSFQeAIGaR9Sp8V/GBMyMDI1MTIwMjE0NTUzMi4xNDla
# MASAAgH0oIHhpIHeMIHbMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
# bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
# aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVyYXRpb25zMScwJQYD
# VQQLEx5uU2hpZWxkIFRTUyBFU046N0QwMC0wNUUwLUQ5NDcxNTAzBgNVBAMTLE1p
# Y3Jvc29mdCBQdWJsaWMgUlNBIFRpbWUgU3RhbXBpbmcgQXV0aG9yaXR5oIIPITCC
# B4IwggVqoAMCAQICEzMAAAAF5c8P/2YuyYcAAAAAAAUwDQYJKoZIhvcNAQEMBQAw
# dzELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjFI
# MEYGA1UEAxM/TWljcm9zb2Z0IElkZW50aXR5IFZlcmlmaWNhdGlvbiBSb290IENl
# cnRpZmljYXRlIEF1dGhvcml0eSAyMDIwMB4XDTIwMTExOTIwMzIzMVoXDTM1MTEx
# OTIwNDIzMVowYTELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
# b3JhdGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFB1YmxpYyBSU0EgVGltZXN0YW1w
# aW5nIENBIDIwMjAwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQCefOdS
# Y/3gxZ8FfWO1BiKjHB7X55cz0RMFvWVGR3eRwV1wb3+yq0OXDEqhUhxqoNv6iYWK
# jkMcLhEFxvJAeNcLAyT+XdM5i2CgGPGcb95WJLiw7HzLiBKrxmDj1EQB/mG5eEiR
# BEp7dDGzxKCnTYocDOcRr9KxqHydajmEkzXHOeRGwU+7qt8Md5l4bVZrXAhK+WSk
# 5CihNQsWbzT1nRliVDwunuLkX1hyIWXIArCfrKM3+RHh+Sq5RZ8aYyik2r8HxT+l
# 2hmRllBvE2Wok6IEaAJanHr24qoqFM9WLeBUSudz+qL51HwDYyIDPSQ3SeHtKog0
# ZubDk4hELQSxnfVYXdTGncaBnB60QrEuazvcob9n4yR65pUNBCF5qeA4QwYnilBk
# fnmeAjRN3LVuLr0g0FXkqfYdUmj1fFFhH8k8YBozrEaXnsSL3kdTD01X+4LfIWOu
# FzTzuoslBrBILfHNj8RfOxPgjuwNvE6YzauXi4orp4Sm6tF245DaFOSYbWFK5ZgG
# 6cUY2/bUq3g3bQAqZt65KcaewEJ3ZyNEobv35Nf6xN6FrA6jF9447+NHvCjeWLCQ
# Z3M8lgeCcnnhTFtyQX3XgCoc6IRXvFOcPVrr3D9RPHCMS6Ckg8wggTrtIVnY8yjb
# vGOUsAdZbeXUIQAWMs0d3cRDv09SvwVRd61evQIDAQABo4ICGzCCAhcwDgYDVR0P
# AQH/BAQDAgGGMBAGCSsGAQQBgjcVAQQDAgEAMB0GA1UdDgQWBBRraSg6NS9IY0DP
# e9ivSek+2T3bITBUBgNVHSAETTBLMEkGBFUdIAAwQTA/BggrBgEFBQcCARYzaHR0
# cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9Eb2NzL1JlcG9zaXRvcnkuaHRt
# MBMGA1UdJQQMMAoGCCsGAQUFBwMIMBkGCSsGAQQBgjcUAgQMHgoAUwB1AGIAQwBB
# MA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAUyH7SaoUqG8oZmAQHJ89QEE9o
# qKIwgYQGA1UdHwR9MHsweaB3oHWGc2h0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9w
# a2lvcHMvY3JsL01pY3Jvc29mdCUyMElkZW50aXR5JTIwVmVyaWZpY2F0aW9uJTIw
# Um9vdCUyMENlcnRpZmljYXRlJTIwQXV0aG9yaXR5JTIwMjAyMC5jcmwwgZQGCCsG
# AQUFBwEBBIGHMIGEMIGBBggrBgEFBQcwAoZ1aHR0cDovL3d3dy5taWNyb3NvZnQu
# Y29tL3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQlMjBJZGVudGl0eSUyMFZlcmlmaWNh
# dGlvbiUyMFJvb3QlMjBDZXJ0aWZpY2F0ZSUyMEF1dGhvcml0eSUyMDIwMjAuY3J0
# MA0GCSqGSIb3DQEBDAUAA4ICAQBfiHbHfm21WhV150x4aPpO4dhEmSUVpbixNDmv
# 6TvuIHv1xIs174bNGO/ilWMm+Jx5boAXrJxagRhHQtiFprSjMktTliL4sKZyt2i+
# SXncM23gRezzsoOiBhv14YSd1Klnlkzvgs29XNjT+c8hIfPRe9rvVCMPiH7zPZcw
# 5nNjthDQ+zD563I1nUJ6y59TbXWsuyUsqw7wXZoGzZwijWT5oc6GvD3HDokJY401
# uhnj3ubBhbkR83RbfMvmzdp3he2bvIUztSOuFzRqrLfEvsPkVHYnvH1wtYyrt5vS
# hiKheGpXa2AWpsod4OJyT4/y0dggWi8g/tgbhmQlZqDUf3UqUQsZaLdIu/XSjgoZ
# qDjamzCPJtOLi2hBwL+KsCh0Nbwc21f5xvPSwym0Ukr4o5sCcMUcSy6TEP7uMV8R
# X0eH/4JLEpGyae6Ki8JYg5v4fsNGif1OXHJ2IWG+7zyjTDfkmQ1snFOTgyEX8qBp
# efQbF0fx6URrYiarjmBprwP6ZObwtZXJ23jK3Fg/9uqM3j0P01nzVygTppBabzxP
# Ah/hHhhls6kwo3QLJ6No803jUsZcd4JQxiYHHc+Q/wAMcPUnYKv/q2O444LO1+n6
# j01z5mggCSlRwD9faBIySAcA9S8h22hIAcRQqIGEjolCK9F6nK9ZyX4lhthsGHum
# aABdWzCCB5cwggV/oAMCAQICEzMAAABV2d1pJij5+OIAAAAAAFUwDQYJKoZIhvcN
# AQEMBQAwYTELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3Jh
# dGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFB1YmxpYyBSU0EgVGltZXN0YW1waW5n
# IENBIDIwMjAwHhcNMjUxMDIzMjA0NjQ5WhcNMjYxMDIyMjA0NjQ5WjCB2zELMAkG
# A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
# HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9z
# b2Z0IEFtZXJpY2EgT3BlcmF0aW9uczEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNO
# OjdEMDAtMDVFMC1EOTQ3MTUwMwYDVQQDEyxNaWNyb3NvZnQgUHVibGljIFJTQSBU
# aW1lIFN0YW1waW5nIEF1dGhvcml0eTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC
# AgoCggIBAL25H5IeWUiz9DAlFmn2sPymaFWbvYkMfK+ScIWb3a1IvOlIwghUDjY0
# Gp6yMRhfYURiGS0GedIB6ywvuH6VBCX3+bdOFcAclgtv21jrpOjZmk4fSaT2Q3Bs
# zUfeUJa8o3xI7ZfoMY9dszTxHQAz6ZVX87fHGEVhQcfxW33IdPJOj/ae419qtYxT
# 21MVmCfsTshgtWioQxmOW/vMC9/b+qgtBxSMf798vm3qfmhF6KCvFaHlivrM32hY
# 16PGE3L0PFC+LM7vRxU7mTb+r76CeybvqOWk4+dbKYftPhV1t/E5S/6wwXeYmu/Y
# 7JC7Tnh2w45G5Y4pcM3oHMb/YuPRdOWa0v+RC2QgmNVWqjuxDiylWscXQDuaMtb2
# 9AcdGUVV9ZsRY2M2sthAtOdZOshiR5ufMtaHtiCkWv0jNfgUxrHurxzYuUNneWZ6
# EfQDgFAw8CSCKkSOK2c9jEop4ddVq10xvbqxdrqMneVXvvIcXrPQAXj9j2ECpV2E
# wMb3Wnmpw00P78JpzPsk3Fs61ZvOGd/F1RcOBu6f2TWdp7HL7+rq7tgHr13Mldbf
# IWu4lpoYYE1gTQa1Yrg5XN4j7zs9klT2z3qocmPzV8DWQgIHNh+aTs7bujMEMQyI
# 7Xt1zPxZCgcR6H0tmmzU/9BxvsWbRalCQ2sYGyWupTdc4e7KY7kPAgMBAAGjggHL
# MIIBxzAdBgNVHQ4EFgQUVgRfEG3cCAPwyL+pyRbKwdesZbYwHwYDVR0jBBgwFoAU
# a2koOjUvSGNAz3vYr0npPtk92yEwbAYDVR0fBGUwYzBhoF+gXYZbaHR0cDovL3d3
# dy5taWNyb3NvZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIwUHVibGljJTIw
# UlNBJTIwVGltZXN0YW1waW5nJTIwQ0ElMjAyMDIwLmNybDB5BggrBgEFBQcBAQRt
# MGswaQYIKwYBBQUHMAKGXWh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMv
# Y2VydHMvTWljcm9zb2Z0JTIwUHVibGljJTIwUlNBJTIwVGltZXN0YW1waW5nJTIw
# Q0ElMjAyMDIwLmNydDAMBgNVHRMBAf8EAjAAMBYGA1UdJQEB/wQMMAoGCCsGAQUF
# BwMIMA4GA1UdDwEB/wQEAwIHgDBmBgNVHSAEXzBdMFEGDCsGAQQBgjdMg30BATBB
# MD8GCCsGAQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL0Rv
# Y3MvUmVwb3NpdG9yeS5odG0wCAYGZ4EMAQQCMA0GCSqGSIb3DQEBDAUAA4ICAQBS
# HuGSVHvalCnFnlsqXIQefH1xP2SFr9g+Vz+f5P7QeywjfQb5jUlSmd1XnJUDPe/M
# HxL7r3TEElL+mNtG6CDPAytStSFPXD9tTBtBMYh8Wqo64pH9qm361yIqeBH979mz
# WCkMQsTd0nM6dUl9B+7qiti+ToXwxIl39eYqLuYYfhD2mqqePXMzUKSQzkf73yYI
# VHP6nLJQz4aAmaWcfG9jg78sBkDV8KpW7JgktuLhphJEN1B+SVHjenPdcmrFXIUu
# /K4jK5ukfWaQIjuaXzSjBlNjC5tQN6adPfA3GxUwHPeR4ekL5If/9vBf13tmzBW+
# gy+0sNGTveb9IL9GU8iX8UvywsX62nhCCPRUhTigDBKdczRUrNrntBhowbfchBDF
# ML8avRMRc9Gmc2JvIryX336SFQ51//q1UU2HMSJEMhWLJSIWJVhfUowsOa+PampI
# zETYfFvTu2mqKJUlWZXkGYxrdCvCczJcqeoadpW1ul6kcdnDh228SQ8ZhDc6IRlM
# 4iNd5SNoNgX+aom3wuGyjUaSaPZWxPB1G2NKiYhPLt0lPHg0Gskj1zhISY8UQkMM
# Dr3o2JgRuT+wnJEDQUp55ddvhSkSoD6I9DL/s+TjIY/c9jLaW5xywJHqdKHUApRM
# sghv7kebSua1upmR+TquelFktDSOjVdSRkuya4uoxTGCB0Mwggc/AgEBMHgwYTEL
# MAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEyMDAG
# A1UEAxMpTWljcm9zb2Z0IFB1YmxpYyBSU0EgVGltZXN0YW1waW5nIENBIDIwMjAC
# EzMAAABV2d1pJij5+OIAAAAAAFUwDQYJYIZIAWUDBAIBBQCgggScMBEGCyqGSIb3
# DQEJEAIPMQIFADAaBgkqhkiG9w0BCQMxDQYLKoZIhvcNAQkQAQQwHAYJKoZIhvcN
# AQkFMQ8XDTI1MTIwMjE0NTUzMlowLwYJKoZIhvcNAQkEMSIEIITKcz4P6Yl/Y7eW
# XItPEtyjj46bWMBHC7is70w1TpqmMIG5BgsqhkiG9w0BCRACLzGBqTCBpjCBozCB
# oAQg2Lk8l2SGYru/ff7+D2qrJnkswcYdK6pGKu7GGGr4/s0wfDBlpGMwYTELMAkG
# A1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEyMDAGA1UE
# AxMpTWljcm9zb2Z0IFB1YmxpYyBSU0EgVGltZXN0YW1waW5nIENBIDIwMjACEzMA
# AABV2d1pJij5+OIAAAAAAFUwggNeBgsqhkiG9w0BCRACEjGCA00wggNJoYIDRTCC
# A0EwggIpAgEBMIIBCaGB4aSB3jCB2zELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldh
# c2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBD
# b3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9u
# czEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNOOjdEMDAtMDVFMC1EOTQ3MTUwMwYD
# VQQDEyxNaWNyb3NvZnQgUHVibGljIFJTQSBUaW1lIFN0YW1waW5nIEF1dGhvcml0
# eaIjCgEBMAcGBSsOAwIaAxUAHTtUAYJlv7bgWVeRBo4X7FeHDeqgZzBlpGMwYTEL
# MAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEyMDAG
# A1UEAxMpTWljcm9zb2Z0IFB1YmxpYyBSU0EgVGltZXN0YW1waW5nIENBIDIwMjAw
# DQYJKoZIhvcNAQELBQACBQDs2PojMCIYDzIwMjUxMjAyMDUzOTQ3WhgPMjAyNTEy
# MDMwNTM5NDdaMHQwOgYKKwYBBAGEWQoEATEsMCowCgIFAOzY+iMCAQAwBwIBAAIC
# GIkwBwIBAAICEncwCgIFAOzaS6MCAQAwNgYKKwYBBAGEWQoEAjEoMCYwDAYKKwYB
# BAGEWQoDAqAKMAgCAQACAwehIKEKMAgCAQACAwGGoDANBgkqhkiG9w0BAQsFAAOC
# AQEAZVgJ7uDBWC6P8VlYQG6GQYR8+R06vJs0CIDBrJgaaK5H/AeHGp7bZxU3V7k9
# KtszyJG3rCV96f9ax5+6WyKI0pN3CAhhng6ZeLU9dY5s1TAumi904IJ6xrMLY/xm
# 42P/MzJ1kfxaHv/+BMljk03xcD1x5DmnVmooK0DRjTmMkgCkPdsKV+wMT6fWsdJr
# /o7FsTVunlxTvlR/KVG9SglkKwmphXYSZF6Y3xnfGO4FIAox8x6YKZsiNipKSGc1
# tXOVHTknk3yQoFGkvGoBxYSA+9IEfCBz1roxzpVXNYKrCo/cNqhAv9x3YmomsSVD
# 49s2FHcuZ4KfApCDu3pQ+gepYTANBgkqhkiG9w0BAQEFAASCAgCRn3/1w6Weijfh
# fnYlZBomwIsJCR9TjLhxZYnCaXloP26/oHBgjvRVxhC1mi7i4EYomQ9F4iSCCqT/
# BDMHQQ2TZ6QcOcagDyRoECCCLwe6KAtmJ+4kU5jGw+iCLXPhN+sI/a1/iYi0O+lZ
# 3hL4jIkQSVrQe9ggiqFvLBU13bp55HD+Xmd4nvpdDjepNyRAQIEgqf50LwjeCgot
# 8RLdRB3PGg5eEEWr7WYCed8N5c7+GZAWKEPEsbkfrfoVzKFHoUf4kDz+57WGEcKG
# sUOqOV0F3ug9/FP7zkjS61Bzo05JY+3x2lzJB9I10Rj+DDCcLx/kCvkHCgi2Aoei
# EFFk6fWizUv1oE3LycekPEAC+UWyRDllOyl/ktRGsgqp9pHJPnmEytMGsCrBOKUQ
# N2XhzWMMvgAHnKu1f3dczChb58aWfpdeSpYPuRBYMyL9afjJW2zHcoRcVjssBy03
# T54KayZXgKYL4L7NoazjZvT/kPLwg9/t1RMUwg8MnVr6sVdOdP9EbEAWahMk0jqC
# i3MbEskoZ4IukeJD3E+tN+aWHrmXQkSBb78GpD/eVVQpYyW4fbg/zAo/aq6ppZcx
# JRkYGG8XkYR9+VLcWqTMdf/GtaLV60kowauPF+rr4O46iz3zEOWJsMLqdTu9MfmK
# urvcR9+Q4H+0fE4OmQ/ChQiCjOrAVQ==
# SIG # End signature block
