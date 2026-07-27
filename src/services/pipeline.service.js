const crypto = require('crypto');
const { loadSkill } = require('./skill.service');
const { runJsonAgent } = require('./ai.service');
const AppError = require('../utils/app-error');

const STAGES = {
  strategy: 'agent-strategy.md',
  copywriter: 'agent-copywriter.md',
  design: 'agent-design.md',
  publisher: 'agent-publisher.md',
  ads: 'agent-ads.md',
  crm: 'agent-crm.md'
};

function normalizeCause(error) {
  return error?.code || error?.message || 'Unknown agent error.';
}

async function generateCampaignPipeline(input) {
  const pipelineId = crypto.randomUUID();
  const startedAt = new Date();
  const startedMs = Date.now();
  const agents = [];
  const results = {};
  const campaignRequest = structuredClone(input);
  const pipelineConfig = {
    strategy: { enabled: true },
    copywriter: { enabled: true },
    design: { enabled: true },
    publisher: { enabled: true },
    ads: { enabled: input.ads?.enabled !== false },
    crm: { enabled: true }
  };

  async function executeStage({ stage, skillFile, input: stageInput }) {
    console.log(`[${pipelineId}] ${stage} started`);
    try {
      const systemPrompt = await loadSkill(skillFile);
      const result = await runJsonAgent({
        agentName: stage,
        systemPrompt,
        userPrompt: stageInput,
        metadata: { pipeline_id: pipelineId }
      });
      agents.push({
        agent: stage,
        status: 'completed',
        duration_ms: result.meta.duration_ms,
        model: result.meta.model,
        response_id: result.meta.response_id
      });
      console.log(`[${pipelineId}] ${stage} completed in ${result.meta.duration_ms}ms`);
      return result.output;
    } catch (error) {
      console.error(`[${pipelineId}] ${stage} failed: ${normalizeCause(error)}`);
      throw new AppError(`${stage[0].toUpperCase()}${stage.slice(1)} Agent failed.`, {
        code: 'PIPELINE_STAGE_FAILED',
        statusCode: 502,
        stage,
        pipelineId,
        details: process.env.NODE_ENV === 'production' ? null : normalizeCause(error),
        cause: error
      });
    }
  }

  results.strategy = await executeStage({
    stage: 'strategy',
    skillFile: STAGES.strategy,
    input: {
      task: 'Analyze the campaign request and create the marketing strategy and content roadmap.',
      campaign_request: campaignRequest
    }
  });

  results.copywriting = await executeStage({
    stage: 'copywriter',
    skillFile: STAGES.copywriter,
    input: {
      task: 'Transform the approved strategy roadmap into campaign-ready copy.',
      runtime_instructions: [
        'Process every available content-calendar item. Preserve the relationship between every strategy item and its resulting copy. Do not omit calendar items.'
      ],
      original_campaign_request: campaignRequest,
      approved_strategy: results.strategy
    }
  });

  const designOutput = await executeStage({
    stage: 'design',
    skillFile: STAGES.design,
    input: {
      task: 'Create visual direction and detailed image-generation prompts for the approved campaign copy.',
      runtime_instructions: [
        'Return design direction only: layout, hierarchy, colors, negative space, image-generation prompts, negative prompts, and production notes.',
        'Do not claim that a physical image or visual asset has been generated.'
      ],
      original_campaign_request: campaignRequest,
      approved_strategy: results.strategy,
      approved_copywriting: results.copywriting,
      asset_dimensions: {
        default_feed: '1080x1350',
        default_story: '1080x1920',
        default_square: '1080x1080'
      }
    }
  });
  results.design = { ...designOutput, asset_generation_status: 'not_generated' };

  const publishingOutput = await executeStage({
    stage: 'publisher',
    skillFile: STAGES.publisher,
    input: {
      task: 'Prepare a draft publishing payload. Do not publish anything.',
      runtime_instructions: [
        'No final visual file exists yet. Return a draft publishing plan and clearly mark the asset as pending. Do not invent a file path or public URL.'
      ],
      original_campaign_request: campaignRequest,
      approved_strategy: results.strategy,
      approved_copywriting: results.copywriting,
      approved_design_direction: results.design,
      available_assets: [],
      publishing_context: {
        mode: 'draft_only',
        timezone: input.publishing?.timezone || 'Asia/Jakarta'
      }
    }
  });
  results.publishing = { ...publishingOutput, status: 'requires_asset' };

  if (!pipelineConfig.ads.enabled) {
    const reason = 'Paid advertising is disabled.';
    results.ads = { status: 'skipped', reason };
    agents.push({ agent: 'ads', status: 'skipped', duration_ms: 0, reason });
    console.log(`[${pipelineId}] ads skipped: ${reason}`);
  } else {
    const adsOutput = await executeStage({
      stage: 'ads',
      skillFile: STAGES.ads,
      input: {
        task: 'Prepare a draft paid advertising plan based on the approved campaign.',
        runtime_instructions: [
          'Create a draft plan only. Do not claim that an ad campaign has been created, submitted, approved, or activated.',
          'No final visual asset exists. Mark all asset dependencies as pending.'
        ],
        original_campaign_request: campaignRequest,
        approved_strategy: results.strategy,
        approved_copywriting: results.copywriting,
        approved_design_direction: results.design,
        budget: input.ads?.budget || {},
        available_assets: []
      }
    });
    results.ads = {
      ...adsOutput,
      status: input.ads?.budget ? 'draft' : 'requires_budget',
      asset_status: 'pending'
    };
  }

  const crmOutput = await executeStage({
    stage: 'crm',
    skillFile: STAGES.crm,
    input: {
      task: 'Create the initial CRM and campaign-evaluation plan based on the available campaign data. Do not invent performance results.',
      runtime_instructions: [
        'No actual performance analytics are available. Do not evaluate the campaign as successful or unsuccessful. Return an initial measurement plan, decision rules, and draft lead follow-up templates only.',
        'Do not claim that any CRM follow-up message has been sent.'
      ],
      original_campaign_request: campaignRequest,
      approved_strategy: results.strategy,
      approved_copywriting: results.copywriting,
      publishing_plan: results.publishing,
      ads_plan: results.ads,
      analytics: null,
      lead_trigger: null
    }
  });
  results.crm = { ...crmOutput, evaluation_status: 'awaiting_data' };

  const completedAt = new Date();
  return {
    pipeline_id: pipelineId,
    status: 'completed',
    campaign_request: campaignRequest,
    results,
    execution: {
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: Date.now() - startedMs,
      agents
    }
  };
}

module.exports = { generateCampaignPipeline };
