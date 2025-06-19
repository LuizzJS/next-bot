const messages = {
  restrictions: {
    missing_args:
      '❗ {user}, este comando requer mais argumentos.\nExemplo: {example}',
    group_only: '❗ {user}, este comando só pode ser usado em grupos.',
    owner_only:
      '❗ {user}, apenas o dono e os administradores do bot pode usar este comando.',
    admin_only:
      '❗ {user}, você precisa ser administrador para usar este comando.',
  },
  errors: {
    unknownError:
      '❌ Ocorreu um erro ao processar sua mensagem, {user}. Tente novamente mais tarde.',
    userCreationFailed:
      '❌ Não foi possível criar seu perfil no banco de dados.',
    groupUpdateFailed: '⚠️ Não foi possível atualizar os dados do grupo.',
    mediaProcessingFailed: '❌ Erro ao processar a mídia recebida.',
    commandExecutionFailed: '❌ Houve um problema ao executar o comando.',
  },
};

export default messages;
