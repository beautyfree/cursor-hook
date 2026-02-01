/**
 * Cursor hook schema definitions.
 *
 * Mirrors the documented hook payloads and responses at
 * https://cursor.com/docs/agent/hooks so hook scripts can be fully typed.
 */

/**
 * Supported hook event names.
 *
 * Docs: Hook events section.
 */
export type HookEventName =
  | 'sessionStart'
  | 'sessionEnd'
  | 'preToolUse'
  | 'postToolUse'
  | 'postToolUseFailure'
  | 'subagentStart'
  | 'subagentStop'
  | 'beforeShellExecution'
  | 'afterShellExecution'
  | 'beforeMCPExecution'
  | 'afterMCPExecution'
  | 'beforeReadFile'
  | 'afterFileEdit'
  | 'beforeSubmitPrompt'
  | 'preCompact'
  | 'stop'
  | 'afterAgentResponse'
  | 'afterAgentThought'
  | 'beforeTabFileRead'
  | 'afterTabFileEdit'

/**
 * Properties shared by every hook payload.
 *
 * Docs: Common schema – Input (all hooks).
 */
export interface HookPayloadBase {
  conversation_id: string
  generation_id: string
  model: string
  hook_event_name: HookEventName
  cursor_version: string
  workspace_roots: string[]
  user_email: string | null
  transcript_path: string | null
}

/**
 * Decision returned by beforeShellExecution / beforeMCPExecution hooks.
 */
export type HookPermission = 'allow' | 'deny' | 'ask'

/**
 * Base shape for permissioned responses.
 */
export interface HookPermissionResponse {
  permission: HookPermission
  userMessage?: string
  agentMessage?: string
}

/**
 * Payload provided to sessionStart hooks.
 */
export interface SessionStartPayload extends HookPayloadBase {
  hook_event_name: 'sessionStart'
  session_id: string
  is_background_agent: boolean
  composer_mode?: 'agent' | 'ask' | 'edit'
}

export interface SessionStartResponse {
  env?: Record<string, string>
  additional_context?: string
  continue?: boolean
  user_message?: string
}

/**
 * Payload provided to sessionEnd hooks.
 */
export interface SessionEndPayload extends HookPayloadBase {
  hook_event_name: 'sessionEnd'
  session_id: string
  reason: 'completed' | 'aborted' | 'error' | 'window_close' | 'user_close'
  duration_ms: number
  is_background_agent: boolean
  final_status: string
  error_message?: string
}

export type SessionEndResponse = void

/**
 * Payload provided to preToolUse hooks.
 */
export interface PreToolUsePayload extends HookPayloadBase {
  hook_event_name: 'preToolUse'
  tool_name: string
  tool_input: unknown
  tool_use_id: string
  cwd: string
  agent_message: string
}

export interface PreToolUseResponse {
  decision: 'allow' | 'deny'
  reason?: string
  updated_input?: unknown
}

/**
 * Payload provided to postToolUse hooks.
 */
export interface PostToolUsePayload extends HookPayloadBase {
  hook_event_name: 'postToolUse'
  tool_name: string
  tool_input: unknown
  tool_output: string
  tool_use_id: string
  cwd: string
  duration: number
}

export interface PostToolUseResponse {
  updated_mcp_tool_output?: unknown
}

/**
 * Payload provided to postToolUseFailure hooks.
 */
export interface PostToolUseFailurePayload extends HookPayloadBase {
  hook_event_name: 'postToolUseFailure'
  tool_name: string
  tool_input: unknown
  tool_use_id: string
  cwd: string
  error_message: string
  failure_type: 'timeout' | 'error' | 'permission_denied'
  duration: number
  is_interrupt: boolean
}

export type PostToolUseFailureResponse = void

/**
 * Payload provided to subagentStart hooks.
 */
export interface SubagentStartPayload extends HookPayloadBase {
  hook_event_name: 'subagentStart'
  subagent_type: string
  prompt: string
}

export interface SubagentStartResponse {
  decision: 'allow' | 'deny'
  reason?: string
}

/**
 * Payload provided to subagentStop hooks.
 */
export interface SubagentStopPayload extends HookPayloadBase {
  hook_event_name: 'subagentStop'
  subagent_type: string
  status: 'completed' | 'error'
  result: string
  duration: number
  agent_transcript_path: string | null
}

export interface SubagentStopResponse {
  followup_message?: string
}

/**
 * Payload provided to beforeShellExecution hooks.
 *
 * Docs: beforeShellExecution / beforeMCPExecution – Input section.
 */
export interface BeforeShellExecutionPayload extends HookPayloadBase {
  hook_event_name: 'beforeShellExecution'
  command: string
  cwd: string
  timeout?: number
}

export type BeforeShellExecutionResponse = HookPermissionResponse

/**
 * Payload provided to afterShellExecution hooks.
 */
export interface AfterShellExecutionPayload extends HookPayloadBase {
  hook_event_name: 'afterShellExecution'
  command: string
  output: string
  duration: number
}

export type AfterShellExecutionResponse = void

/**
 * Payload provided to beforeMCPExecution hooks.
 *
 * Docs: beforeShellExecution / beforeMCPExecution – Input section.
 */
export interface BeforeMCPExecutionPayload extends HookPayloadBase {
  hook_event_name: 'beforeMCPExecution'
  tool_name: string
  tool_input: unknown
  url?: string
  command?: string
}

export type BeforeMCPExecutionResponse = HookPermissionResponse

/**
 * Payload provided to afterMCPExecution hooks.
 */
export interface AfterMCPExecutionPayload extends HookPayloadBase {
  hook_event_name: 'afterMCPExecution'
  tool_name: string
  tool_input: string
  result_json: string
  duration: number
}

export type AfterMCPExecutionResponse = void

/**
 * Individual text edit reported by afterFileEdit hooks.
 */
export interface HookTextEdit {
  old_string: string
  new_string: string
  range?: {
    start_line_number: number
    start_column: number
    end_line_number: number
    end_column: number
  }
  old_line?: string
  new_line?: string
}

/**
 * Payload provided to afterFileEdit hooks.
 *
 * Docs: afterFileEdit – Input section.
 */
export interface AfterFileEditPayload extends HookPayloadBase {
  hook_event_name: 'afterFileEdit'
  file_path: string
  edits: HookTextEdit[]
}

export type AfterFileEditResponse = void

/**
 * Attachment metadata supplied with file/prompt hooks.
 */
export interface HookAttachment {
  type: 'file' | 'rule' | string
  filePath: string
}

/**
 * Payload provided to beforeReadFile hooks.
 *
 * Docs: beforeReadFile – Input / Output sections.
 */
export interface BeforeReadFilePayload extends HookPayloadBase {
  hook_event_name: 'beforeReadFile'
  file_path: string
  content: string
  attachments: HookAttachment[]
}

export interface BeforeReadFileResponse {
  permission: 'allow' | 'deny'
  user_message?: string
}

/**
 * Payload provided to beforeTabFileRead hooks.
 */
export interface BeforeTabFileReadPayload extends HookPayloadBase {
  hook_event_name: 'beforeTabFileRead'
  file_path: string
  content: string
}

export interface BeforeTabFileReadResponse {
  permission: 'allow' | 'deny'
}

/**
 * Payload provided to afterTabFileEdit hooks.
 */
export interface AfterTabFileEditPayload extends HookPayloadBase {
  hook_event_name: 'afterTabFileEdit'
  file_path: string
  edits: HookTextEdit[]
}

export type AfterTabFileEditResponse = void

/**
 * Payload provided to beforeSubmitPrompt hooks.
 *
 * Docs: beforeSubmitPrompt – Input / Output sections.
 */
export interface BeforeSubmitPromptPayload extends HookPayloadBase {
  hook_event_name: 'beforeSubmitPrompt'
  prompt: string
  attachments: HookAttachment[]
}

export interface BeforeSubmitPromptResponse {
  continue: boolean
  user_message?: string
}

/**
 * Payload provided to afterAgentResponse hooks.
 */
export interface AfterAgentResponsePayload extends HookPayloadBase {
  hook_event_name: 'afterAgentResponse'
  text: string
}

export type AfterAgentResponseResponse = void

/**
 * Payload provided to afterAgentThought hooks.
 */
export interface AfterAgentThoughtPayload extends HookPayloadBase {
  hook_event_name: 'afterAgentThought'
  text: string
  duration_ms?: number
}

export type AfterAgentThoughtResponse = void

/**
 * Payload provided to stop hooks.
 *
 * Docs: stop – Input section.
 */
export interface StopPayload extends HookPayloadBase {
  hook_event_name: 'stop'
  status: 'completed' | 'aborted' | 'error'
  loop_count: number
}

export interface StopResponse {
  followup_message?: string
}

/**
 * Payload provided to preCompact hooks.
 */
export interface PreCompactPayload extends HookPayloadBase {
  hook_event_name: 'preCompact'
  trigger: 'auto' | 'manual'
  context_usage_percent: number
  context_tokens: number
  context_window_size: number
  message_count: number
  messages_to_compact: number
  is_first_compaction: boolean
}

export interface PreCompactResponse {
  user_message?: string
}

/**
 * Mapping of each hook to its payload type.
 */
export interface HookPayloadMap {
  sessionStart: SessionStartPayload
  sessionEnd: SessionEndPayload
  preToolUse: PreToolUsePayload
  postToolUse: PostToolUsePayload
  postToolUseFailure: PostToolUseFailurePayload
  subagentStart: SubagentStartPayload
  subagentStop: SubagentStopPayload
  beforeShellExecution: BeforeShellExecutionPayload
  afterShellExecution: AfterShellExecutionPayload
  beforeMCPExecution: BeforeMCPExecutionPayload
  afterMCPExecution: AfterMCPExecutionPayload
  beforeReadFile: BeforeReadFilePayload
  afterFileEdit: AfterFileEditPayload
  beforeSubmitPrompt: BeforeSubmitPromptPayload
  afterAgentResponse: AfterAgentResponsePayload
  afterAgentThought: AfterAgentThoughtPayload
  preCompact: PreCompactPayload
  stop: StopPayload
  beforeTabFileRead: BeforeTabFileReadPayload
  afterTabFileEdit: AfterTabFileEditPayload
}

/**
 * Mapping of each hook to its expected response type.
 */
export interface HookResponseMap {
  sessionStart: SessionStartResponse
  sessionEnd: SessionEndResponse
  preToolUse: PreToolUseResponse
  postToolUse: PostToolUseResponse
  postToolUseFailure: PostToolUseFailureResponse
  subagentStart: SubagentStartResponse
  subagentStop: SubagentStopResponse
  beforeShellExecution: BeforeShellExecutionResponse
  afterShellExecution: AfterShellExecutionResponse
  beforeMCPExecution: BeforeMCPExecutionResponse
  afterMCPExecution: AfterMCPExecutionResponse
  beforeReadFile: BeforeReadFileResponse
  afterFileEdit: AfterFileEditResponse
  beforeSubmitPrompt: BeforeSubmitPromptResponse
  afterAgentResponse: AfterAgentResponseResponse
  afterAgentThought: AfterAgentThoughtResponse
  preCompact: PreCompactResponse
  stop: StopResponse
  beforeTabFileRead: BeforeTabFileReadResponse
  afterTabFileEdit: AfterTabFileEditResponse
}

export type HookPayload = HookPayloadMap[HookEventName]
export type HookResponse = HookResponseMap[HookEventName]

/**
 * Helper signature for strongly typed hook handlers.
 */
export type HookHandler<Event extends HookEventName> = (
  payload: HookPayloadMap[Event]
) => HookResponseMap[Event] | Promise<HookResponseMap[Event]>

/**
 * Narrow a payload to a specific event type based on the hook_event_name.
 */
export function isHookPayloadOf<Event extends HookEventName>(
  payload: unknown,
  event: Event
): payload is HookPayloadMap[Event] {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'hook_event_name' in payload &&
    (payload as HookPayloadBase).hook_event_name === event
  )
}

/**
 * Hook process configuration definition used within hooks.json.
 *
 * Docs: Hooks configuration – hook definitions.
 */
export interface HookCommandConfig {
  /**
   * Command executed when the hook fires. Accepts absolute paths, relative
   * paths (from hooks.json), or shell command strings.
   */
  command: string
  /**
   * Hook execution type: "command" or "prompt"
   */
  type?: 'command' | 'prompt'
  /**
   * Execution timeout in seconds
   */
  timeout?: number
  /**
   * Per-script loop limit for stop/subagentStop hooks
   */
  loop_limit?: number | null
  /**
   * Filter criteria for when hook runs
   */
  matcher?: {
    tool_name?: string
    subagent_type?: string
  }
  /**
   * For prompt-based hooks: the prompt to evaluate
   */
  prompt?: string
  /**
   * For prompt-based hooks: override the default LLM model
   */
  model?: string
}

/**
 * Top-level hooks.json structure. Hook names align with documented events
 * and are limited to the currently supported list.
 *
 * Docs: Hooks configuration – hooks.json schema.
 */
export interface CursorHooksConfig {
  version: 1
  hooks: Partial<Record<HookEventName, HookCommandConfig[]>>
}