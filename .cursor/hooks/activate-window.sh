#!/bin/bash

# Unified hook script to handle window activation
# Handles both beforeSubmitPrompt (save window ID) and afterAgentResponse (activate window)
# Cross-platform support: macOS, Linux, Windows (WSL/Git Bash)

# Detect operating system
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            echo "macos"
            ;;
        Linux*)
            echo "linux"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Get the current front window identifier
# Returns window identifier (name on macOS/Linux, handle on Windows)
get_front_window() {
    local os=$(detect_os)
    
    case "$os" in
        "macos")
            # macOS: Get window name using AppleScript
            osascript -e 'tell application "System Events"
                tell process "Cursor"
                    try
                        set windowList to every window
                        if (count of windowList) > 0 then
                            set frontWindow to item 1 of windowList
                            return name of frontWindow
                        else
                            return ""
                        end if
                    on error
                        return ""
                    end try
                end tell
            end tell' 2>/dev/null
            ;;
        "linux")
            # Linux: Get active window using xdotool or wmctrl
            if command -v xdotool >/dev/null 2>&1; then
                # Use xdotool to get window name
                xdotool getactivewindow getwindowname 2>/dev/null || echo ""
            elif command -v wmctrl >/dev/null 2>&1; then
                # Use wmctrl to get active window title
                wmctrl -l | grep -i "cursor" | head -1 | cut -d' ' -f5- 2>/dev/null || echo ""
            else
                echo ""
            fi
            ;;
        "windows")
            # Windows: Use PowerShell to get window title
            # This works in Git Bash and WSL
            powershell.exe -Command "
                Add-Type -TypeDefinition @'
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport(\"user32.dll\")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport(\"user32.dll\", CharSet=CharSet.Auto)]
                    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder title, int size);
                }
'@
                \$hwnd = [Win32]::GetForegroundWindow()
                \$title = New-Object System.Text.StringBuilder 256
                [Win32]::GetWindowText(\$hwnd, \$title, 256)
                if (\$title.ToString() -match 'Cursor') { \$title.ToString() } else { '' }
            " 2>/dev/null | tr -d '\r' || echo ""
            ;;
        *)
            echo ""
            ;;
    esac
}

# Activate Cursor application
activate_cursor() {
    local os=$(detect_os)
    
    case "$os" in
        "macos")
            osascript -e 'tell application "Cursor" to activate' 2>/dev/null
            ;;
        "linux")
            if command -v xdotool >/dev/null 2>&1; then
                # Find Cursor window and activate it
                xdotool search --name "Cursor" windowactivate 2>/dev/null || true
            elif command -v wmctrl >/dev/null 2>&1; then
                # Activate Cursor window using wmctrl
                wmctrl -a "Cursor" 2>/dev/null || true
            fi
            ;;
        "windows")
            # Windows: Use PowerShell to activate Cursor window
            powershell.exe -Command "
                Add-Type -TypeDefinition @'
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport(\"user32.dll\")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                    [DllImport(\"user32.dll\")]
                    public static extern bool SetForegroundWindow(IntPtr hWnd);
                    [DllImport(\"user32.dll\")]
                    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
                }
'@
                \$processes = Get-Process | Where-Object { \$_.MainWindowTitle -like '*Cursor*' }
                if (\$processes) {
                    [Win32]::SetForegroundWindow(\$processes[0].MainWindowHandle)
                }
            " 2>/dev/null || true
            ;;
    esac
}

# Activate specific window by identifier
activate_window_by_id() {
    local window_id="$1"
    local os=$(detect_os)
    
    if [ -z "$window_id" ]; then
        activate_cursor
        return
    fi
    
    case "$os" in
        "macos")
            # macOS: Activate window by name
            osascript -e "tell application \"System Events\"
                tell process \"Cursor\"
                    try
                        set targetWindow to first window whose name is \"$window_id\"
                        perform action \"AXRaise\" of targetWindow
                    end try
                end tell
            end tell
            tell application \"Cursor\" to activate" 2>/dev/null
            ;;
        "linux")
            # Linux: Activate window by title
            if command -v xdotool >/dev/null 2>&1; then
                xdotool search --name "$window_id" windowactivate 2>/dev/null || activate_cursor
            elif command -v wmctrl >/dev/null 2>&1; then
                wmctrl -a "$window_id" 2>/dev/null || activate_cursor
            else
                activate_cursor
            fi
            ;;
        "windows")
            # Windows: Activate window by title using PowerShell
            powershell.exe -Command "
                \$processes = Get-Process | Where-Object { \$_.MainWindowTitle -like '*$window_id*' }
                if (\$processes) {
                    Add-Type -TypeDefinition @'
                    using System;
                    using System.Runtime.InteropServices;
                    public class Win32 {
                        [DllImport(\"user32.dll\")]
                        public static extern bool SetForegroundWindow(IntPtr hWnd);
                    }
'@
                    [Win32]::SetForegroundWindow(\$processes[0].MainWindowHandle)
                }
            " 2>/dev/null || activate_cursor
            ;;
        *)
            activate_cursor
            ;;
    esac
}

# Main script logic
input=$(cat)

# Parse hook_event_name and conversation_id from JSON input
hook_event_name=$(echo "$input" | grep -o '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
conversation_id=$(echo "$input" | grep -o '"conversation_id"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

# Storage directory for window IDs (stored alongside hooks)
storage_dir="$HOME/.cursor/hooks/activate-window-ids"
mkdir -p "$storage_dir"

# Handle different hook events
case "$hook_event_name" in
    "beforeSubmitPrompt")
        # Save the current front window identifier before submitting prompt
        window_id=$(get_front_window)
        
        # Save window identifier with conversation_id as key
        if [ -n "$conversation_id" ] && [ -n "$window_id" ]; then
            echo "$window_id" > "$storage_dir/$conversation_id.txt"
        fi
        ;;
    
    "afterAgentResponse")
        # Activate the saved window after agent response
        if [ -n "$conversation_id" ] && [ -f "$storage_dir/$conversation_id.txt" ]; then
            window_id=$(cat "$storage_dir/$conversation_id.txt" 2>/dev/null)
            
            if [ -n "$window_id" ]; then
                # Activate the specific window
                activate_window_by_id "$window_id"
                
                # Clean up the saved window identifier file after use
                rm -f "$storage_dir/$conversation_id.txt"
            else
                activate_cursor
            fi
        else
            # Fallback: just activate Cursor if no saved window identifier found
            activate_cursor
        fi
        ;;
    
    *)
        # Unknown event, just activate Cursor as fallback
        activate_cursor
        ;;
esac

# Exit successfully
exit 0
