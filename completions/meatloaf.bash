# Meatloaf Bash Completion
# Install: source /path/to/meatloaf-completion.bash
# Or: meatloaf completion bash >> ~/.bashrc

_meatloaf_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  
  commands="create destroy list inspect stop start exec script upload download \
    test batch wait screenshot html logs stats cleanup init templates up agent \
    network volume image compose ps fs snapshot shell bench health port system \
    secrets env watch proxy cron diff monitor git sync audit quota discover help"

  if [[ ${cur} == -* ]] ; then
    COMPREPLY=( $(compgen -W "--help --version --json --quiet --debug" -- ${cur}) )
    return 0
  fi

  if [[ ${prev} == "meatloaf" ]] || [[ ${prev} == "ml" ]] ; then
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    return 0
  fi

  # Subcommands
  case ${prev} in
    network)
      COMPREPLY=( $(compgen -W "create list remove connect disconnect inspect" -- ${cur}) )
      return 0
      ;;
    volume)
      COMPREPLY=( $(compgen -W "create list remove inspect prune" -- ${cur}) )
      return 0
      ;;
    image)
      COMPREPLY=( $(compgen -W "list pull remove build inspect history tag prune" -- ${cur}) )
      return 0
      ;;
    compose|cmp)
      COMPREPLY=( $(compgen -W "up down ps logs" -- ${cur}) )
      return 0
      ;;
    ps)
      COMPREPLY=( $(compgen -W "list kill top tree" -- ${cur}) )
      return 0
      ;;
    fs)
      COMPREPLY=( $(compgen -W "ls cat find write mkdir rm du grep" -- ${cur}) )
      return 0
      ;;
    snapshot)
      COMPREPLY=( $(compgen -W "save restore list export import" -- ${cur}) )
      return 0
      ;;
    health)
      COMPREPLY=( $(compgen -W "check watch system" -- ${cur}) )
      return 0
      ;;
    port)
      COMPREPLY=( $(compgen -W "scan check find map" -- ${cur}) )
      return 0
      ;;
    secrets)
      COMPREPLY=( $(compgen -W "set get list remove inject export import" -- ${cur}) )
      return 0
      ;;
    env|profile)
      COMPREPLY=( $(compgen -W "create show list delete set unset inject merge diff" -- ${cur}) )
      return 0
      ;;
    git)
      COMPREPLY=( $(compgen -W "clone status commit push diff log" -- ${cur}) )
      return 0
      ;;
    sync)
      COMPREPLY=( $(compgen -W "up down watch" -- ${cur}) )
      return 0
      ;;
    proxy)
      COMPREPLY=( $(compgen -W "start forward tunnel stop" -- ${cur}) )
      return 0
      ;;
    cron|schedule)
      COMPREPLY=( $(compgen -W "add list remove clear" -- ${cur}) )
      return 0
      ;;
    diff)
      COMPREPLY=( $(compgen -W "files sb changes" -- ${cur}) )
      return 0
      ;;
    audit)
      COMPREPLY=( $(compgen -W "log stats clear export" -- ${cur}) )
      return 0
      ;;
    quota)
      COMPREPLY=( $(compgen -W "set get limits" -- ${cur}) )
      return 0
      ;;
    discover|dns)
      COMPREPLY=( $(compgen -W "resolve lookup register list" -- ${cur}) )
      return 0
      ;;
    init)
      COMPREPLY=( $(compgen -W "--template --output" -- ${cur}) )
      return 0
      ;;
    create)
      COMPREPLY=( $(compgen -W "--image --port --env --volume --workdir --memory --cpu" -- ${cur}) )
      return 0
      ;;
    destroy|rm)
      # Try to complete sandbox IDs
      local sandboxes=$(meatloaf list --json --quiet 2>/dev/null | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
      COMPREPLY=( $(compgen -W "${sandboxes}" -- ${cur}) )
      return 0
      ;;
  esac
}

complete -F _meatloaf_completions meatloaf
complete -F _meatloaf_completions ml
