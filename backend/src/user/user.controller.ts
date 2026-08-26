import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  async findAll() {
    return this.userService.findAll();
  }

  @Post('create')
  async create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateProfile(
    @Req() request: ExtendedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(request.user!.id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('me/password')
  async changePassword(
    @Req() request: ExtendedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    return this.userService.changePassword(request.user!.id, body);
  }
}
