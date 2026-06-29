export type CallMode = 'voice' | 'video';

/** Shared Jitsi room per swap match — both users join the same room. */
export function callRoomName(matchId: number): string {
  return `SkillSwap-Match-${matchId}`;
}

export function callModeLabel(mode: CallMode): string {
  return mode === 'voice' ? 'Voice call' : 'Video call';
}

/**
 * In-app Jitsi HTML — embeds the meeting inside SkillSwap (no separate Jitsi app).
 * disableDeepLinking + MOBILE_APP_PROMO off skips the "Download from App Store" screen.
 */
export function buildCallHtml(matchId: number, mode: CallMode, displayName = 'SkillSwap User'): string {
  const room = callRoomName(matchId);
  const voiceOnly = mode === 'voice';
  const safeName = displayName.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <style>
    html, body { height: 100%; margin: 0; background: #141022; overflow: hidden; }
    #meet { width: 100%; height: 100%; }
    #status { color: #c4b5fd; font-family: system-ui, sans-serif; font-size: 14px; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div id="status">Connecting to your call…</div>
  <div id="meet"></div>
  <script src="https://meet.jit.si/external_api.js"><\/script>
  <script>
    (function () {
      var status = document.getElementById('status');
      try {
        var api = new JitsiMeetExternalAPI('meet.jit.si', {
          roomName: '${room}',
          parentNode: document.getElementById('meet'),
          width: '100%',
          height: '100%',
          userInfo: { displayName: '${safeName}' },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            startWithVideoMuted: ${voiceOnly ? 'true' : 'false'},
            startAudioOnly: ${voiceOnly ? 'true' : 'false'},
            startSilent: false,
            requireDisplayName: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            HIDE_INVITE_MORE_HEADER: true,
          },
        });
        api.addEventListener('videoConferenceJoined', function () {
          if (status) status.style.display = 'none';
        });
        api.addEventListener('readyToClose', function () {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('hangup');
        });
      } catch (e) {
        if (status) status.textContent = 'Could not start the call. Check camera/mic permissions and try again.';
      }
    })();
  <\/script>
</body>
</html>`;
}

/** @deprecated Use buildCallHtml for in-app calls. */
export function buildCallUrl(matchId: number, mode: CallMode): string {
  const room = encodeURIComponent(callRoomName(matchId));
  const hash =
    mode === 'voice'
      ? 'config.startWithVideoMuted=true&config.startAudioOnly=true&config.prejoinPageEnabled=false&config.disableDeepLinking=true'
      : 'config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true';
  return `https://meet.jit.si/${room}#${hash}`;
}
