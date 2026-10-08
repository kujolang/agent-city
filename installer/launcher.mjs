// Keep the managed runtime available for explicit setup commands as well as start.
export const managedLauncher = `#!/bin/sh
set -eu
cd "$(dirname "$0")"
CITY_MANAGED_LAUNCHER="$PWD/start.command"
export CITY_MANAGED_LAUNCHER
if [ -x .node/bin/node ]; then PATH="$PWD/.node/bin:$PATH"; export PATH; fi
cd agent-city
if [ "$#" -eq 0 ]; then exec npm start; fi
city_command="$1"
shift
case "$city_command" in
  start) exec npm start -- "$@" ;;
  doctor|setup:workcell|setup:videoops|provider:codex|agents:import|recover:workcell)
    exec npm run "$city_command" -- "$@" ;;
  --help|-h)
    printf '%s\\n' 'Agent City: start.command [start|doctor|setup:workcell|setup:videoops|provider:codex|agents:import|recover:workcell] [arguments]' ;;
  *) printf '%s\\n' "Unknown Agent City command: $city_command" >&2; exit 2 ;;
esac
`;
