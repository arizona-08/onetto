import { Body, Controller, Get, Post } from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dtos/create-user.dto";

@Controller('api/users')
export class UserController {
  constructor(
    private readonly userService: UserService
  ) {}

  @Get('all')
  async findAll() {
    return this.userService.findAll();
  }

  @Post('create')
  async create(
    @Body() body: CreateUserDto
  ) {
    return this.userService.create(body);
  }


}