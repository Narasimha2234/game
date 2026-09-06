import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "../user/user.module.js";
import { Transaction } from "./entity/transaction.entity.js";
import { TransactionController } from "./transaction.controller.js";
import { TransactionService } from "./transaction.service.js";

@Module({
   imports:[
    UserModule,
    TypeOrmModule.forFeature([Transaction]),
   ],
    exports:[TransactionService],
    controllers:[TransactionController],
    providers:[TransactionService],
})
export class TransactionModule {}