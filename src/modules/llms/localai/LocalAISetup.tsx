import * as React from 'react';
import { z } from 'zod';

import { Box, Button } from '@mui/joy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { api } from '~/modules/trpc/trpc.client';

import { settingsGap } from '~/common/theme';
import { Link } from '~/common/components/Link';

import { DLLM, DModelSource, DModelSourceId } from '../llm.types';
import { normalizeSetup, SourceSetupLocalAI } from './vendor';
import { useModelsStore, useSourceSetup } from '../llm.store';
import { FormInputKey } from '~/common/components/FormInputKey';


const urlSchema = z.string().url().startsWith('http');


export function LocalAISetup(props: { sourceId: DModelSourceId }) {

  // external state
  const { normSetup: { hostUrl }, updateSetup, sourceLLMs, source } = useSourceSetup<SourceSetupLocalAI>(props.sourceId, normalizeSetup);

  // validate if url is a well formed proper url with zod
  const { success: isValidHost } = urlSchema.safeParse(hostUrl);
  const shallFetchSucceed = isValidHost;

  // fetch models
  const { isFetching, refetch } = api.openai.listModels.useQuery({ oaiKey: '', oaiHost: hostUrl, oaiOrg: '', heliKey: '' }, {
    enabled: !sourceLLMs.length && shallFetchSucceed,
    onSuccess: models => {
      const llms = source ? models.map(model => localAIToDLLM(model, source)) : [];
      useModelsStore.getState().addLLMs(llms);
    },
    staleTime: Infinity,
  });

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: settingsGap }}>

    <FormInputKey
      required noKey
      label='Server URL' rightLabel={<Link level='body2' href='https://github.com/go-skynet/LocalAI' target='_blank'>Learn more</Link>}
      placeholder='e.g., http://127.0.0.1:8080'
      value={hostUrl} onChange={value => updateSetup({ hostUrl: value })}
    />

    <Button
      variant='solid' color='neutral'
      disabled={!shallFetchSucceed || isFetching}
      endDecorator={<FileDownloadIcon />}
      onClick={() => refetch()}
      sx={{ minWidth: 120, ml: 'auto' }}
    >
      Models
    </Button>

  </Box>;
}


function localAIToDLLM(model: { id: string, object: 'model' }, source: DModelSource): DLLM {
  let label = model.id
    .replace('ggml-', '')
    .replace('.bin', '')
    .replaceAll('-', ' ');
  // capitalize first letter of each word
  if (label.length)
    label = label.charAt(0).toUpperCase() + label.slice(1);
  // shall we do some heuristics
  const contextTokens = 4096; // FIXME
  return {
    id: `${source.id}-${model.id}`,
    label,
    created: 0,
    description: 'Local model',
    tags: ['stream', 'chat'],
    contextTokens,
    sId: source.id,
    _source: source,
    settings: {},
  };
}