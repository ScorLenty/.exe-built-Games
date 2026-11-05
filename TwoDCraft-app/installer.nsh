; Выбор при каждой установке: создавать ярлык на рабочем столе или нет.
; Флажок показывается на последней странице установщика (рядом с "Запустить TwoDCraft").
; Блоки ниже нужны только при сборке самого установщика (не при сборке деинсталлятора).
!ifndef BUILD_UNINSTALLER
Function TwoDCraftDesktopShortcut
  SetOutPath "$INSTDIR"
  CreateShortCut "$DESKTOP\TwoDCraft.lnk" "$INSTDIR\TwoDCraft.exe"
FunctionEnd
!endif

!macro customHeader
  !ifndef BUILD_UNINSTALLER
    !define MUI_FINISHPAGE_SHOWREADME
    !define MUI_FINISHPAGE_SHOWREADME_TEXT "Создать ярлык на рабочем столе"
    !define MUI_FINISHPAGE_SHOWREADME_FUNCTION TwoDCraftDesktopShortcut
  !endif
!macroend

; при удалении программы убираем и ярлык на рабочем столе
!macro customUnInstall
  Delete "$DESKTOP\TwoDCraft.lnk"
!macroend
