#!/bin/bash

# hub-completion.sh

_hub() {
    local cur prev opts
    COMPREPLY=()    # Array variable storing the completions.
    cur="${COMP_WORDS[COMP_CWORD]}"   # Current word to complete.
    prev="${COMP_WORDS[COMP_CWORD-1]}" # Previous word.

    if [ "$COMP_CWORD" -eq 1 ]; then
        # First argument: hosts
        COMPREPLY=($(compgen -W "$(_hub.py --hostNames | tr '\n' ' ') off" -- "$cur"))
    elif [ "$COMP_CWORD" -eq 2 ]; then
        # Second argument: ports
        COMPREPLY=($(compgen -W "$(_hub.py --portNames | tr '\n' ' ')" -- "$cur"))
    fi
}

# Set completion for 'hub' command
complete -F _hub hub