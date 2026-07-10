import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgId } from '../common/org-context/org-id.decorator';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Controller('workflows')
@UseGuards(AuthGuard('jwt'))
export class WorkflowsController {
  private readonly logger = new Logger(WorkflowsController.name);

  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listWorkflows(@OrgId() orgId: string) {
    return this.workflowEngine.listWorkflows();
  }

  @Get('executions')
  async listExecutions(
    @OrgId() orgId: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.prisma.workflowExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { steps: true },
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
    @Request() req: any,
  ) {
    const actorId = req.user?.userId ?? 'system';
    this.logger.log(`Workflow ${id} triggered by ${actorId}`);
    return this.workflowEngine.executeWorkflow(id, input, actorId);
  }

  @Get('executions/:id')
  async getExecution(@Param('id') id: string) {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id },
      include: { steps: { orderBy: { startedAt: 'asc' } } },
    });
    if (!execution) throw new NotFoundException(`Execution ${id} not found`);
    return execution;
  }
}
