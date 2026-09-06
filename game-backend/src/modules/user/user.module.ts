import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entity/user.entity.js";
import { UserService } from "./user.service.js";
import { UserController } from "./user.controller.js";


@Module({
    imports:[
        TypeOrmModule.forFeature([User])
    ],
    providers: [UserService],
    exports:[UserService],
    controllers:[UserController]
})
export class UserModule{}