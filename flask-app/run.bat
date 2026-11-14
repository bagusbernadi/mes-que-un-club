@echo off
REM Jalankan MES di PC server kantor. Biarkan jendela ini terbuka.
cd /d %~dp0
if not exist data\mes.db (
  echo Database belum ada. Jalankan: python seed_from_excel.py "file_operator_daily_output.xlsx"
  pause & exit /b
)
python app.py
pause
