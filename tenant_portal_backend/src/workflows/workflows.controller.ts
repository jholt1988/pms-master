import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listWorkflows() {
    return this.workflowEngine.listWorkflows();
  }


  @Get('executions')
  async listExecutions(@Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.prisma.workflowExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { steps: true }
    });
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    const workflow = this.workflowEngine.getWorkflow(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }


  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Body() input: Record<string, any>,
  ) {
    return this.workflowEngine.executeWorkflow(id, input, 'admin-user');
  }

  @Get('executions/:id')
  async getExecution(@Param('id') id: string) {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id },
      include: { steps: { orderBy: { startedAt: 'asc' } } }
    });
    if (!execution) throw new NotFoundException(`Execution ${id} not found`);
    return execution;
  }
}
