@echo off
REM Salin database ke folder backup dengan nama bertanggal. Jadwalkan lewat Task Scheduler (mis. tiap hari 12:00).
cd /d %~dp0
if not exist backup mkdir backup
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmm"') do set TS=%%i
copy /y data\mes.db backup\mes_%TS%.db >nul
echo Backup tersimpan: backup\mes_%TS%.db
