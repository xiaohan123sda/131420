@echo off
cd /d "C:\Program Files\MySQL\MySQL Server 8.4\bin"
start /b mysqld.exe --skip-grant-tables --datadir="D:\ProgramData\MySQL\MySQL Server 8.4\Data"
echo MySQL started with skip-grant-tables